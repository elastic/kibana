/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';

import type { SavedObject } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionResult, ActionsClient } from '@kbn/actions-plugin/server';
import type {
  CaseUserActionResponse,
  GetCaseConnectorsResponse,
  CaseConnector,
} from '../../../common/api';
import { GetCaseConnectorsResponseRt } from '../../../common/api';
import { isConnectorUserAction, isCreateCaseUserAction } from '../../../common/utils/user_actions';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import type { Authorization, OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';
import type { GetConnectorsRequest } from './types';
import type { CaseConnectorActivity, PushInfo } from '../../services/user_actions/types';
import type { CaseUserActionService } from '../../services';

export const getConnectors = async (
  { caseId }: GetConnectorsRequest,
  clientArgs: CasesClientArgs
): Promise<GetCaseConnectorsResponse> => {
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

    const results = await getConnectorsInfo({
      caseId,
      actionsClient,
      connectors,
      latestUserAction,
      userActionService,
      logger,
    });

    return GetCaseConnectorsResponseRt.encode(results);
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve the case connectors case id: ${caseId}: ${error}`,
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
  connectors: CaseConnectorActivity[];
  latestUserAction?: SavedObject<CaseUserActionResponse>;
  authorization: PublicMethodsOf<Authorization>;
}) => {
  const entities: OwnerEntity[] = latestUserAction
    ? [{ owner: latestUserAction.attributes.owner, id: latestUserAction.id }]
    : [];

  for (const connector of connectors) {
    entities.push({
      owner: connector.fields.attributes.owner,
      id: connector.connectorId,
    });

    if (connector.push) {
      entities.push({
        owner: connector.push.attributes.owner,
        id: connector.connectorId,
      });
    }
  }

  await authorization.ensureAuthorized({
    entities,
    operation: Operations.getConnectors,
  });
};

interface EnrichedPushInfo {
  pushDate: Date;
  connectorFieldsUsedInPush: CaseConnector;
}

const getConnectorsInfo = async ({
  caseId,
  connectors,
  latestUserAction,
  actionsClient,
  userActionService,
  logger,
}: {
  caseId: string;
  connectors: CaseConnectorActivity[];
  latestUserAction?: SavedObject<CaseUserActionResponse>;
  actionsClient: PublicMethodsOf<ActionsClient>;
  userActionService: CaseUserActionService;
  logger: CasesClientArgs['logger'];
}): Promise<GetCaseConnectorsResponse> => {
  const connectorIds = connectors.map((connector) => connector.connectorId);
  const pushInfo = await getPushInfo({ caseId, activity: connectors, userActionService });
  const actionConnectors = await getActionConnectors(actionsClient, logger, connectorIds);

  return createConnectorInfoResult({ actionConnectors, connectors, pushInfo, latestUserAction });
};

const getActionConnectors = async (
  actionsClient: PublicMethodsOf<ActionsClient>,
  logger: CasesClientArgs['logger'],
  ids: string[]
): Promise<ActionResult[]> => {
  try {
    return await actionsClient.getBulk(ids);
  } catch (error) {
    // silent error and log it
    logger.error(`Failed to retrieve action connectors in the get case connectors route: ${error}`);
    return [];
  }
};

const getPushInfo = async ({
  caseId,
  activity,
  userActionService,
}: {
  caseId: string;
  activity: CaseConnectorActivity[];
  userActionService: CaseUserActionService;
}): Promise<Map<string, EnrichedPushInfo>> => {
  const pushRequest: PushInfo[] = [];

  for (const connectorInfo of activity) {
    const pushCreatedAt = getDate(connectorInfo.push?.attributes.created_at);

    if (connectorInfo.push != null && pushCreatedAt != null) {
      pushRequest.push({ connectorId: connectorInfo.connectorId, date: pushCreatedAt });
    }
  }

  const connectorFieldsForPushes = await userActionService.getConnectorFieldsBeforeLatestPush(
    caseId,
    pushRequest
  );

  const enrichedPushInfo = new Map<string, EnrichedPushInfo>();
  for (const request of pushRequest) {
    const connectorFieldsSO = connectorFieldsForPushes.get(request.connectorId);
    const connectorFields = getConnectorInfoFromSavedObject(connectorFieldsSO);

    if (connectorFields != null) {
      enrichedPushInfo.set(request.connectorId, {
        pushDate: request.date,
        connectorFieldsUsedInPush: connectorFields,
      });
    }
  }

  return enrichedPushInfo;
};

const getDate = (timestamp: string | undefined): Date | undefined => {
  if (timestamp == null) {
    return;
  }

  const date = new Date(timestamp);

  if (isDateValid(date)) {
    return date;
  }
};

const isDateValid = (date: Date): boolean => {
  return !isNaN(date.getTime());
};

const getConnectorInfoFromSavedObject = (
  savedObject: SavedObject<CaseUserActionResponse> | undefined
): CaseConnector | undefined => {
  if (
    savedObject != null &&
    (isConnectorUserAction(savedObject.attributes) ||
      isCreateCaseUserAction(savedObject.attributes))
  ) {
    return savedObject.attributes.payload.connector;
  }
};

const createConnectorInfoResult = ({
  actionConnectors,
  connectors,
  pushInfo,
  latestUserAction,
}: {
  actionConnectors: ActionResult[];
  connectors: CaseConnectorActivity[];
  pushInfo: Map<string, EnrichedPushInfo>;
  latestUserAction?: SavedObject<CaseUserActionResponse>;
}) => {
  const results: GetCaseConnectorsResponse = {};
  const actionConnectorsMap = new Map(
    actionConnectors.map((actionConnector) => [actionConnector.id, { ...actionConnector }])
  );

  for (const aggregationConnector of connectors) {
    const connectorDetails = actionConnectorsMap.get(aggregationConnector.connectorId);
    const connector = getConnectorInfoFromSavedObject(aggregationConnector.fields);

    const latestUserActionCreatedAt = getDate(latestUserAction?.attributes.created_at);

    if (connector != null) {
      const enrichedPushInfo = pushInfo.get(aggregationConnector.connectorId);
      const needsToBePushed = hasDataToPush({
        connector,
        pushInfo: enrichedPushInfo,
        latestUserActionDate: latestUserActionCreatedAt,
      });

      results[connector.id] = {
        ...connector,
        name: connectorDetails?.name ?? connector.name,
        needsToBePushed,
        latestPushDate: enrichedPushInfo?.pushDate.toISOString(),
        hasBeenPushed: hasBeenPushed(enrichedPushInfo),
      };
    }
  }

  return results;
};

/**
 * The algorithm to determine if a specific connector within a case needs to be pushed is as follows:
 * 1. Check to see if the connector has been used to push, if it hasn't then we need to push
 * 2. Check to see if the most recent connector fields are different than the connector fields used in the most recent push,
 *  if they are different then we need to push
 * 3. Check to see if the most recent valid user action (a valid user action is one that changes the title, description,
 *  tags, or creation of a comment) was created after the most recent push (aka did the user do something new that needs
 *  to be pushed)
 */
const hasDataToPush = ({
  connector,
  pushInfo,
  latestUserActionDate,
}: {
  connector: CaseConnector;
  pushInfo?: EnrichedPushInfo;
  latestUserActionDate?: Date;
}): boolean => {
  return (
    /**
     * This isEqual call satisfies the first two steps of the algorithm above because if a push never occurred then the
     * push fields will be undefined which will not equal the latest connector fields anyway.
     */
    !isEqual(connector, pushInfo?.connectorFieldsUsedInPush) ||
    (pushInfo != null && latestUserActionDate != null && latestUserActionDate > pushInfo.pushDate)
  );
};

const hasBeenPushed = (pushInfo: EnrichedPushInfo | undefined): boolean => {
  return pushInfo != null;
};
