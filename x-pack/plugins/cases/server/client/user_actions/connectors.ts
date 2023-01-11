/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';

import type { SavedObject } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
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

    const enrichedConnectors = await enrichConnectors({
      caseId,
      actionsClient,
      connectors,
      latestUserAction,
      userActionService,
    });

    const results: GetCaseConnectorsResponse = {};

    for (const enrichedConnector of enrichedConnectors) {
      results[enrichedConnector.connector.id] = {
        ...enrichedConnector.connector,
        name: enrichedConnector.name,
        needsToBePushed: hasDataToPush(enrichedConnector),
        latestPushDate: enrichedConnector.pushInfo?.pushDate.toISOString(),
        hasBeenPushed: hasBeenPushed(enrichedConnector),
      };
    }

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

interface EnrichedConnector {
  connector: CaseConnector;
  name: string;
  pushInfo?: EnrichedPushInfo;
  latestUserActionDate?: Date;
}

const enrichConnectors = async ({
  caseId,
  connectors,
  latestUserAction,
  actionsClient,
  userActionService,
}: {
  caseId: string;
  connectors: CaseConnectorActivity[];
  latestUserAction?: SavedObject<CaseUserActionResponse>;
  actionsClient: PublicMethodsOf<ActionsClient>;
  userActionService: CaseUserActionService;
}): Promise<EnrichedConnector[]> => {
  const pushInfo = await getPushInfo({ caseId, activity: connectors, userActionService });

  const enrichedConnectors: EnrichedConnector[] = [];

  for (const aggregationConnector of connectors) {
    const connectorDetails = await actionsClient.get({ id: aggregationConnector.connectorId });
    const connector = getConnectorInfoFromSavedObject(aggregationConnector.fields);

    const latestUserActionCreatedAt = getDate(latestUserAction?.attributes.created_at);

    if (connector != null) {
      enrichedConnectors.push({
        connector,
        name: connectorDetails.name,
        pushInfo: pushInfo.get(aggregationConnector.connectorId),
        latestUserActionDate: latestUserActionCreatedAt,
      });
    }
  }

  return enrichedConnectors;
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

  if (pushRequest.length <= 0) {
    return new Map();
  }

  const connectorFieldsForPushes = await userActionService.getConnectorFieldsUsedInPushes(
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

const hasDataToPush = (enrichedConnectorInfo: EnrichedConnector): boolean => {
  return (
    !isEqual(
      enrichedConnectorInfo.connector,
      enrichedConnectorInfo.pushInfo?.connectorFieldsUsedInPush
    ) ||
    (enrichedConnectorInfo.pushInfo != null &&
      enrichedConnectorInfo.latestUserActionDate != null &&
      enrichedConnectorInfo.latestUserActionDate > enrichedConnectorInfo.pushInfo.pushDate)
  );
};

const hasBeenPushed = (enrichedConnectorInfo: EnrichedConnector): boolean => {
  return enrichedConnectorInfo.pushInfo != null;
};
