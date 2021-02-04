/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import Boom from '@hapi/boom';

import { flattenCaseSavedObject } from '../../routes/api/utils';

import {
  ActionConnector,
  CaseResponseRt,
  CaseResponse,
  CaseStatuses,
  ExternalServiceResponse,
} from '../../../common/api';
import { buildCaseUserActionItem } from '../../services/user_actions/helpers';

import { CaseClientPush, CaseClientFactoryArguments } from '../types';
import { createIncident, getCommentContextFromAttributes, isCommentAlertType } from './utils';

export const push = ({
  savedObjectsClient,
  caseService,
  caseConfigureService,
  userActionService,
  request,
  response,
}: CaseClientFactoryArguments) => async ({
  actionsClient,
  caseClient,
  caseId,
  connectorId,
}: CaseClientPush): Promise<CaseResponse> => {
  /* Start of push to external service */
  const theCase = await caseClient.get({ id: caseId, includeComments: true });

  if (theCase.status === CaseStatuses.closed) {
    throw Boom.conflict(
      `This case ${theCase.title} is closed. You can not pushed if the case is closed.`
    );
  }

  const connector = await actionsClient.get({ id: connectorId });
  const userActions = await caseClient.getUserActions({ caseId });
  const alerts = await caseClient.getAlerts({
    ids: theCase.comments?.filter(isCommentAlertType).map((comment) => comment.alertId) ?? [],
  });

  const connectorMappings = await caseClient.getMappings({
    actionsClient,
    caseClient,
    connectorId: connector.id,
    connectorType: connector.actionTypeId,
  });

  const res = await createIncident({
    actionsClient,
    theCase,
    userActions,
    connector: connector as ActionConnector,
    mappings: connectorMappings,
    alerts,
  });

  const pushRes = await actionsClient.execute({
    actionId: connector.id,
    params: {
      subAction: 'pushToService',
      subActionParams: res,
    },
  });

  if (pushRes.status === 'error') {
    throw new Error(pushRes.serviceMessage ?? pushRes.message ?? 'Error pushing to service');
  }

  /* End of push to external service */

  /* Start of update case with push information */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { username, full_name, email } = await caseService.getUser({ request, response });

  const pushedDate = new Date().toISOString();

  const [myCase, myCaseConfigure, totalCommentsFindByCases, connectors] = await Promise.all([
    caseService.getCase({
      client: savedObjectsClient,
      caseId,
    }),
    caseConfigureService.find({ client: savedObjectsClient }),
    caseService.getAllCaseComments({
      client: savedObjectsClient,
      caseId,
      options: {
        fields: [],
        page: 1,
        perPage: 1,
      },
    }),
    actionsClient.getAll(),
  ]);

  const comments = await caseService.getAllCaseComments({
    client: savedObjectsClient,
    caseId,
    options: {
      fields: [],
      page: 1,
      perPage: totalCommentsFindByCases.total,
    },
  });

  const externalServiceResponse = pushRes.data as ExternalServiceResponse;

  const externalService = {
    pushed_at: pushedDate,
    pushed_by: { username, full_name, email },
    connector_id: connector.id,
    connector_name: connector.name,
    external_id: externalServiceResponse.id,
    external_title: externalServiceResponse.title,
    external_url: externalServiceResponse.url,
  };

  const updateConnector = myCase.attributes.connector;

  if (
    isEmpty(updateConnector) ||
    (updateConnector != null && updateConnector.id === 'none') ||
    !connectors.some((c) => c.id === updateConnector.id)
  ) {
    throw Boom.notFound('Connector not found or set to none');
  }

  const [updatedCase, updatedComments] = await Promise.all([
    caseService.patchCase({
      client: savedObjectsClient,
      caseId,
      updatedAttributes: {
        ...(myCaseConfigure.total > 0 &&
        myCaseConfigure.saved_objects[0].attributes.closure_type === 'close-by-pushing'
          ? {
              status: CaseStatuses.closed,
              closed_at: pushedDate,
              closed_by: { email, full_name, username },
            }
          : {}),
        external_service: externalService,
        updated_at: pushedDate,
        updated_by: { username, full_name, email },
      },
      version: myCase.version,
    }),

    caseService.patchComments({
      client: savedObjectsClient,
      comments: comments.saved_objects
        .filter((comment) => comment.attributes.pushed_at == null)
        .map((comment) => ({
          commentId: comment.id,
          updatedAttributes: {
            pushed_at: pushedDate,
            pushed_by: { username, full_name, email },
          },
          version: comment.version,
        })),
    }),

    userActionService.postUserActions({
      client: savedObjectsClient,
      actions: [
        ...(myCaseConfigure.total > 0 &&
        myCaseConfigure.saved_objects[0].attributes.closure_type === 'close-by-pushing'
          ? [
              buildCaseUserActionItem({
                action: 'update',
                actionAt: pushedDate,
                actionBy: { username, full_name, email },
                caseId,
                fields: ['status'],
                newValue: CaseStatuses.closed,
                oldValue: myCase.attributes.status,
              }),
            ]
          : []),
        buildCaseUserActionItem({
          action: 'push-to-service',
          actionAt: pushedDate,
          actionBy: { username, full_name, email },
          caseId,
          fields: ['pushed'],
          newValue: JSON.stringify(externalService),
        }),
      ],
    }),
  ]);
  /* End of update case with push information */

  return CaseResponseRt.encode(
    flattenCaseSavedObject({
      savedObject: {
        ...myCase,
        ...updatedCase,
        attributes: { ...myCase.attributes, ...updatedCase?.attributes },
        references: myCase.references,
      },
      comments: comments.saved_objects.map((origComment) => {
        const updatedComment = updatedComments.saved_objects.find((c) => c.id === origComment.id);
        return {
          ...origComment,
          ...updatedComment,
          attributes: {
            ...origComment.attributes,
            ...updatedComment?.attributes,
            ...getCommentContextFromAttributes(origComment.attributes),
          },
          version: updatedComment?.version ?? origComment.version,
          references: origComment?.references ?? [],
        };
      }),
    })
  );
};
