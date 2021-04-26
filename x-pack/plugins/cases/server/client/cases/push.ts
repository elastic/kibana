/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  SavedObjectsBulkUpdateResponse,
  SavedObjectsUpdateResponse,
  SavedObjectsFindResponse,
  SavedObject,
} from 'kibana/server';
import { ActionResult } from '../../../../actions/server';

import {
  ActionConnector,
  CaseResponseRt,
  CaseResponse,
  CaseStatuses,
  ExternalServiceResponse,
  ESCaseAttributes,
  CommentAttributes,
  CaseUserActionsResponse,
  ESCasesConfigureAttributes,
  CaseType,
} from '../../../common/api';
import { buildCaseUserActionItem } from '../../services/user_actions/helpers';

import { createIncident, getCommentContextFromAttributes } from './utils';
import { createCaseError, flattenCaseSavedObject, getAlertInfoFromComments } from '../../common';
import { ENABLE_CASE_CONNECTOR } from '../../../common/constants';
import { CasesClient, CasesClientArgs, CasesClientInternal } from '..';

/**
 * Returns true if the case should be closed based on the configuration settings and whether the case
 * is a collection. Collections are not closable because we aren't allowing their status to be changed.
 * In the future we could allow push to close all the sub cases of a collection but that's not currently supported.
 */
function shouldCloseByPush(
  configureSettings: SavedObjectsFindResponse<ESCasesConfigureAttributes>,
  caseInfo: SavedObject<ESCaseAttributes>
): boolean {
  return (
    configureSettings.total > 0 &&
    configureSettings.saved_objects[0].attributes.closure_type === 'close-by-pushing' &&
    caseInfo.attributes.type !== CaseType.collection
  );
}

interface PushParams {
  caseId: string;
  connectorId: string;
}

export const push = async (
  { connectorId, caseId }: PushParams,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient,
  casesClientInternal: CasesClientInternal
): Promise<CaseResponse> => {
  const {
    savedObjectsClient,
    attachmentService,
    caseService,
    caseConfigureService,
    userActionService,
    actionsClient,
    user,
    logger,
  } = clientArgs;

  /* Start of push to external service */
  let theCase: CaseResponse;
  let connector: ActionResult;
  let userActions: CaseUserActionsResponse;
  let alerts;
  let connectorMappings;
  let externalServiceIncident;

  try {
    [theCase, connector, userActions] = await Promise.all([
      casesClient.cases.get({
        id: caseId,
        includeComments: true,
        includeSubCaseComments: ENABLE_CASE_CONNECTOR,
      }),
      actionsClient.get({ id: connectorId }),
      casesClient.userActions.getAll({ caseId }),
    ]);
  } catch (e) {
    const message = `Error getting case and/or connector and/or user actions: ${e.message}`;
    throw createCaseError({ message, error: e, logger });
  }

  // We need to change the logic when we support subcases
  if (theCase?.status === CaseStatuses.closed) {
    throw Boom.conflict(
      `This case ${theCase.title} is closed. You can not pushed if the case is closed.`
    );
  }

  const alertsInfo = getAlertInfoFromComments(theCase?.comments);

  try {
    alerts = await casesClientInternal.alerts.get({
      alertsInfo,
    });
  } catch (e) {
    throw createCaseError({
      message: `Error getting alerts for case with id ${theCase.id}: ${e.message}`,
      logger,
      error: e,
    });
  }

  try {
    connectorMappings = await casesClientInternal.configuration.getMappings({
      connectorId: connector.id,
      connectorType: connector.actionTypeId,
    });

    if (connectorMappings.length === 0) {
      throw new Error('Connector mapping has not been created');
    }
  } catch (e) {
    const message = `Error getting mapping for connector with id ${connector.id}: ${e.message}`;
    throw createCaseError({ message, error: e, logger });
  }

  try {
    externalServiceIncident = await createIncident({
      actionsClient,
      theCase,
      userActions,
      connector: connector as ActionConnector,
      mappings: connectorMappings[0].attributes.mappings,
      alerts,
    });
  } catch (e) {
    const message = `Error creating incident for case with id ${theCase.id}: ${e.message}`;
    throw createCaseError({ error: e, message, logger });
  }

  const pushRes = await actionsClient.execute({
    actionId: connector?.id ?? '',
    params: {
      subAction: 'pushToService',
      subActionParams: externalServiceIncident,
    },
  });

  if (pushRes.status === 'error') {
    throw Boom.failedDependency(
      pushRes.serviceMessage ?? pushRes.message ?? 'Error pushing to service'
    );
  }

  /* End of push to external service */

  /* Start of update case with push information */
  let myCase;
  let myCaseConfigure;
  let comments;

  try {
    [myCase, myCaseConfigure, comments] = await Promise.all([
      caseService.getCase({
        soClient: savedObjectsClient,
        id: caseId,
      }),
      caseConfigureService.find({ soClient: savedObjectsClient }),
      caseService.getAllCaseComments({
        soClient: savedObjectsClient,
        id: caseId,
        options: {
          fields: [],
          page: 1,
          perPage: theCase?.totalComment ?? 0,
        },
        includeSubCaseComments: ENABLE_CASE_CONNECTOR,
      }),
    ]);
  } catch (e) {
    const message = `Error getting user and/or case and/or case configuration and/or case comments: ${e.message}`;
    throw createCaseError({ error: e, message, logger });
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { username, full_name, email } = user;
  const pushedDate = new Date().toISOString();
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

  let updatedCase: SavedObjectsUpdateResponse<ESCaseAttributes>;
  let updatedComments: SavedObjectsBulkUpdateResponse<CommentAttributes>;

  const shouldMarkAsClosed = shouldCloseByPush(myCaseConfigure, myCase);

  try {
    [updatedCase, updatedComments] = await Promise.all([
      caseService.patchCase({
        soClient: savedObjectsClient,
        caseId,
        updatedAttributes: {
          ...(shouldMarkAsClosed
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

      attachmentService.bulkUpdate({
        soClient: savedObjectsClient,
        comments: comments.saved_objects
          .filter((comment) => comment.attributes.pushed_at == null)
          .map((comment) => ({
            attachmentId: comment.id,
            updatedAttributes: {
              pushed_at: pushedDate,
              pushed_by: { username, full_name, email },
            },
            version: comment.version,
          })),
      }),

      userActionService.bulkCreate({
        soClient: savedObjectsClient,
        actions: [
          ...(shouldMarkAsClosed
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
  } catch (e) {
    const message = `Error updating case and/or comments and/or creating user action: ${e.message}`;
    throw createCaseError({ error: e, message, logger });
  }
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
