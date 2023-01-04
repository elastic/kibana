/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type {
  CaseUserActionsResponse,
  CaseUserActionResponse,
  GetCaseConnectorsResponse,
  CaseConnector,
} from '../../../common/api';
import { CaseUserActionsResponseRt, GetCaseConnectorsResponseRt } from '../../../common/api';
import { isConnectorUserAction, isCreateCaseUserAction } from '../../../common/utils/user_actions';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import type { Authorization, OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';
import type { GetConnectorsRequest, UserActionGet } from './types';
import type { CaseConnectors } from '../../services/user_actions/types';

export const getConnectors = async (
  { caseId }: GetConnectorsRequest,
  clientArgs: CasesClientArgs
): Promise<CaseUserActionsResponse> => {
  const {
    services: { userActionService },
    logger,
    authorization,
    actionsClient,
  } = clientArgs;

  try {
    const [connectors, latestUserAction] = await Promise.all([
      userActionService.getCaseConnectorInformation(caseId),
      userActionService.getMostRecentUserAction(caseId),
    ]);

    await checkConnectorsAuthorization({ authorization, connectors, latestUserAction });

    const results: GetCaseConnectorsResponse = [];
    for (const [id, connector] of connectors.entries()) {
      const fieldsCreatedAt = new Date(connector.fields.attributes.created_at);
      if (connector.push) {
        const pushCreatedAt = new Date(connector.push.attributes.created_at);
        if (!isNaN(fieldsCreatedAt.getTime()) && !isNaN(pushCreatedAt.getTime())) {
        }
      } else {
        results.push({
          fields: connector.fields.attributes.payload,
          id: connector.id,
          name: '',
          needsToBePushed: true,
          type: '',
        });
      }
    }

    return GetCaseConnectorsResponseRt.encode({});
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve user actions case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

const checkConnectorsAuthorization = async ({
  connectors,
  latestUserAction,
  authorization,
}: {
  connectors: CaseConnectors;
  latestUserAction?: SavedObject<CaseUserActionResponse>;
  authorization: PublicMethodsOf<Authorization>;
}) => {
  const entities: OwnerEntity[] = latestUserAction
    ? [{ owner: latestUserAction.attributes.owner, id: latestUserAction.id }]
    : [];

  for (const connector of connectors) {
    entities.push({
      owner: connector.fields.savedObject.attributes.owner,
      id: connector.fields.connectorId,
    });

    if (connector.push) {
      entities.push({
        owner: connector.push.savedObject.attributes.owner,
        id: connector.push.connectorId,
      });
    }
  }

  await authorization.ensureAuthorized({
    entities,
    operation: Operations.getUserActions,
  });
};

const enrichConnectors = async ({
  connectors,
  latestUserAction,
  actionsClient,
}: {
  connectors: CaseConnectors;
  latestUserAction?: SavedObject<CaseUserActionResponse>;
  actionsClient: PublicMethodsOf<ActionsClient>;
}) => {
  const enrichedConnectors: Array<{
    connector: CaseConnector;
    fieldsUpdatedDate: Date;
    pushDate?: Date;
    name: string;
  }> = [];

  for (const aggregationConnector of connectors) {
    const connectorDetails = await actionsClient.get({ id: aggregationConnector.connectorId });
    const fieldsUpdatedDate = new Date(aggregationConnector.fields.attributes.created_at);
    const connector = getConnectorInfoFromSavedObject(aggregationConnector.fields);

    let pushCreatedAt: Date | undefined;
    if (aggregationConnector.push) {
      pushCreatedAt = new Date(aggregationConnector.push.attributes.created_at);
    }

    if (isDateValid(fieldsUpdatedDate) && connector) {
      enrichedConnectors.push({
        connector,
        fieldsUpdatedDate,
        ...(pushCreatedAt != null && { pushDate: pushCreatedAt }),
        name: connectorDetails.name,
      });
    }
  }

  return enrichedConnectors;
};

const isDateValid = (date: Date): boolean => {
  return !isNaN(date.getTime());
};

const getConnectorInfoFromSavedObject = (
  savedObject: SavedObject<CaseUserActionResponse>
): CaseConnector | undefined => {
  if (
    isConnectorUserAction(savedObject.attributes) ||
    isCreateCaseUserAction(savedObject.attributes)
  ) {
    return savedObject.attributes.payload.connector;
  }
};

export const get = async (
  { caseId }: UserActionGet,
  clientArgs: CasesClientArgs
): Promise<CaseUserActionsResponse> => {
  const {
    services: { userActionService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const userActions = await userActionService.getAll(caseId);

    await authorization.ensureAuthorized({
      entities: userActions.saved_objects.map((userAction) => ({
        owner: userAction.attributes.owner,
        id: userAction.id,
      })),
      operation: Operations.getUserActions,
    });

    const resultsToEncode = extractAttributes(userActions);

    return CaseUserActionsResponseRt.encode(resultsToEncode);
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve user actions case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

function extractAttributes(
  userActions: SavedObjectsFindResponse<CaseUserActionResponse>
): CaseUserActionsResponse {
  return userActions.saved_objects.map((so) => so.attributes);
}
