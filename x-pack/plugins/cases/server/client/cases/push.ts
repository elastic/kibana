/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { nodeBuilder } from '@kbn/es-query';
import { SavedObjectsFindResponse } from '@kbn/core/server';

import {
  ActionConnector,
  CaseResponseRt,
  CaseResponse,
  CaseStatuses,
  ExternalServiceResponse,
  CasesConfigureAttributes,
  ActionTypes,
  OWNER_FIELD,
  CommentType,
  CommentRequestAlertType,
} from '../../../common/api';
import { CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';

import { createIncident, getCommentContextFromAttributes } from './utils';
import { createCaseError } from '../../common/error';
import {
  createAlertUpdateRequest,
  flattenCaseSavedObject,
  getAlertInfoFromComments,
} from '../../common/utils';
import { CasesClient, CasesClientArgs, CasesClientInternal } from '..';
import { Operations } from '../../authorization';
import { casesConnectors } from '../../connectors';
import { getAlerts } from '../alerts/get';
import { buildFilter } from '../utils';

/**
 * Returns true if the case should be closed based on the configuration settings.
 */
function shouldCloseByPush(
  configureSettings: SavedObjectsFindResponse<CasesConfigureAttributes>
): boolean {
  return (
    configureSettings.total > 0 &&
    configureSettings.saved_objects[0].attributes.closure_type === 'close-by-pushing'
  );
}

const changeAlertsStatusToClose = async (
  caseId: string,
  caseService: CasesClientArgs['caseService'],
  alertsService: CasesClientArgs['alertsService']
) => {
  const alertAttachments = (await caseService.getAllCaseComments({
    id: [caseId],
    options: {
      filter: nodeBuilder.is(`${CASE_COMMENT_SAVED_OBJECT}.attributes.type`, CommentType.alert),
    },
  })) as SavedObjectsFindResponse<CommentRequestAlertType>;

  const alerts = alertAttachments.saved_objects
    .map((attachment) =>
      createAlertUpdateRequest({
        comment: attachment.attributes,
        status: CaseStatuses.closed,
      })
    )
    .flat();

  await alertsService.updateAlertsStatus(alerts);
};

/**
 * Parameters for pushing a case to an external system
 */
export interface PushParams {
  /**
   * The ID of a case
   */
  caseId: string;
  /**
   * The ID of an external system to push to
   */
  connectorId: string;
}

/**
 * Push a case to an external service.
 *
 * @ignore
 */
export const push = async (
  { connectorId, caseId }: PushParams,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient,
  casesClientInternal: CasesClientInternal
): Promise<CaseResponse> => {
  const {
    unsecuredSavedObjectsClient,
    attachmentService,
    caseService,
    caseConfigureService,
    userActionService,
    alertsService,
    actionsClient,
    user,
    logger,
    authorization,
  } = clientArgs;

  try {
    /* Start of push to external service */
    const [theCase, connector, userActions] = await Promise.all([
      casesClient.cases.get({
        id: caseId,
        includeComments: true,
      }),
      actionsClient.get({ id: connectorId }),
      casesClient.userActions.getAll({ caseId }),
    ]);

    await authorization.ensureAuthorized({
      entities: [{ owner: theCase.owner, id: caseId }],
      operation: Operations.pushCase,
    });

    if (theCase?.status === CaseStatuses.closed) {
      throw Boom.conflict(
        `The ${theCase.title} case is closed. Pushing a closed case is not allowed.`
      );
    }

    const alertsInfo = getAlertInfoFromComments(theCase?.comments);

    const alerts = await getAlerts(alertsInfo, clientArgs);

    const getMappingsResponse = await casesClientInternal.configuration.getMappings({
      connector: theCase.connector,
    });

    const mappings =
      getMappingsResponse.length === 0
        ? await casesClientInternal.configuration.createMappings({
            connector: theCase.connector,
            owner: theCase.owner,
          })
        : getMappingsResponse[0].attributes.mappings;

    const externalServiceIncident = await createIncident({
      actionsClient,
      theCase,
      userActions,
      connector: connector as ActionConnector,
      mappings,
      alerts,
      casesConnectors,
    });

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

    const ownerFilter = buildFilter({
      filters: theCase.owner,
      field: OWNER_FIELD,
      operator: 'or',
      type: Operations.findConfigurations.savedObjectType,
    });

    /* Start of update case with push information */
    const [myCase, myCaseConfigure, comments] = await Promise.all([
      caseService.getCase({
        id: caseId,
      }),
      caseConfigureService.find({ unsecuredSavedObjectsClient, options: { filter: ownerFilter } }),
      caseService.getAllCaseComments({
        id: caseId,
        options: {
          fields: [],
          page: 1,
          perPage: theCase?.totalComment ?? 0,
        },
      }),
    ]);

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

    const shouldMarkAsClosed = shouldCloseByPush(myCaseConfigure);

    const [updatedCase, updatedComments] = await Promise.all([
      caseService.patchCase({
        originalCase: myCase,
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
        unsecuredSavedObjectsClient,
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
    ]);

    if (shouldMarkAsClosed) {
      await userActionService.createUserAction({
        type: ActionTypes.status,
        unsecuredSavedObjectsClient,
        payload: { status: CaseStatuses.closed },
        user,
        caseId,
        owner: myCase.attributes.owner,
      });

      if (myCase.attributes.settings.syncAlerts) {
        await changeAlertsStatusToClose(myCase.id, caseService, alertsService);
      }
    }

    await userActionService.createUserAction({
      type: ActionTypes.pushed,
      unsecuredSavedObjectsClient,
      payload: { externalService },
      user,
      caseId,
      owner: myCase.attributes.owner,
    });

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
  } catch (error) {
    throw createCaseError({ message: `Failed to push case: ${error}`, error, logger });
  }
};
