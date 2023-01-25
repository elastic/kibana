/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionResult, ActionsClient } from '@kbn/actions-plugin/server';
import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type {
  GetCaseConnectorsResponse,
  CaseConnector,
  CaseUserActionInjectedAttributesWithoutActionId,
  CaseExternalServiceBasic,
} from '../../../common/api';
import { GetCaseConnectorsResponseRt } from '../../../common/api';
import {
  isConnectorUserAction,
  isCreateCaseUserAction,
  isPushedUserAction,
} from '../../../common/utils/user_actions';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import type { Authorization, OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';
import type { GetConnectorsRequest } from './types';
import type { CaseConnectorActivity } from '../../services/user_actions/types';
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
  latestUserAction?: SavedObject<CaseUserActionInjectedAttributesWithoutActionId>;
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
      entities.push(
        ...[
          {
            owner: connector.push.mostRecent.attributes.owner,
            id: connector.connectorId,
          },
          {
            owner: connector.push.oldest.attributes.owner,
            id: connector.connectorId,
          },
        ]
      );
    }
  }

  await authorization.ensureAuthorized({
    entities,
    operation: Operations.getConnectors,
  });
};

interface EnrichedPushInfo {
  latestPushDate: Date;
  oldestPushDate: Date;
  externalService: CaseExternalServiceBasic;
  connectorFieldsUsedInPush: CaseConnector;
}

const getConnectorsInfo = async ({
  caseId,
  connectors,
  latestUserAction,
  actionsClient,
  userActionService,
}: {
  caseId: string;
  connectors: CaseConnectorActivity[];
  latestUserAction?: SavedObject<CaseUserActionInjectedAttributesWithoutActionId>;
  actionsClient: PublicMethodsOf<ActionsClient>;
  userActionService: CaseUserActionService;
}): Promise<GetCaseConnectorsResponse> => {
  const connectorIds = connectors.map((connector) => connector.connectorId);

  const [pushInfo, actionConnectors] = await Promise.all([
    getEnrichedPushInfo({ caseId, activity: connectors, userActionService }),
    actionsClient.getBulk(connectorIds),
  ]);

  return createConnectorInfoResult({ actionConnectors, connectors, pushInfo, latestUserAction });
};

interface PushDetails {
  connectorId: string;
  externalService: CaseExternalServiceBasic;
  mostRecentPush: Date;
  oldestPush: Date;
}

const getEnrichedPushInfo = async ({
  caseId,
  activity,
  userActionService,
}: {
  caseId: string;
  activity: CaseConnectorActivity[];
  userActionService: CaseUserActionService;
}): Promise<Map<string, EnrichedPushInfo>> => {
  const pushDetails = getPushDetails(activity);

  const connectorFieldsForPushes = await userActionService.getConnectorFieldsBeforeLatestPush(
    caseId,
    pushDetails.map((push) => ({ connectorId: push.connectorId, date: push.mostRecentPush }))
  );

  const enrichedPushInfo = new Map<string, EnrichedPushInfo>();
  for (const pushInfo of pushDetails) {
    const connectorFieldsSO = connectorFieldsForPushes.get(pushInfo.connectorId);
    const connectorFields = getConnectorInfoFromSavedObject(connectorFieldsSO);

    if (connectorFields != null) {
      enrichedPushInfo.set(pushInfo.connectorId, {
        latestPushDate: pushInfo.mostRecentPush,
        oldestPushDate: pushInfo.oldestPush,
        externalService: pushInfo.externalService,
        connectorFieldsUsedInPush: connectorFields,
      });
    }
  }

  return enrichedPushInfo;
};

const getPushDetails = (activity: CaseConnectorActivity[]) => {
  const pushDetails: PushDetails[] = [];

  for (const connectorInfo of activity) {
    const externalService = getExternalServiceFromSavedObject(connectorInfo.push?.mostRecent);
    const mostRecentPushCreatedAt = getDate(connectorInfo.push?.mostRecent.attributes.created_at);
    const oldestPushCreatedAt = getDate(connectorInfo.push?.oldest.attributes.created_at);

    if (
      connectorInfo.push != null &&
      externalService != null &&
      mostRecentPushCreatedAt != null &&
      oldestPushCreatedAt != null
    ) {
      pushDetails.push({
        connectorId: connectorInfo.connectorId,
        externalService,
        mostRecentPush: mostRecentPushCreatedAt,
        oldestPush: oldestPushCreatedAt,
      });
    }
  }

  return pushDetails;
};

const getExternalServiceFromSavedObject = (
  savedObject: SavedObject<CaseUserActionInjectedAttributesWithoutActionId> | undefined
): CaseExternalServiceBasic | undefined => {
  if (savedObject != null && isPushedUserAction(savedObject.attributes)) {
    return savedObject.attributes.payload.externalService;
  }
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
  savedObject: SavedObject<CaseUserActionInjectedAttributesWithoutActionId> | undefined
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
  latestUserAction?: SavedObject<CaseUserActionInjectedAttributesWithoutActionId>;
}) => {
  const results: GetCaseConnectorsResponse = {};

  for (let i = 0; i < connectors.length; i++) {
    const connectorDetails = actionConnectors[i];
    const aggregationConnector = connectors[i];
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
        name: connectorDetails.name,
        push: {
          needsToBePushed,
          hasBeenPushed: hasBeenPushed(enrichedPushInfo),
          externalService: enrichedPushInfo?.externalService,
          latestPushDate: enrichedPushInfo?.latestPushDate.toISOString(),
          oldestPushDate: enrichedPushInfo?.oldestPushDate.toISOString(),
        },
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
    (pushInfo != null &&
      latestUserActionDate != null &&
      latestUserActionDate > pushInfo.latestPushDate)
  );
};

const hasBeenPushed = (pushInfo: EnrichedPushInfo | undefined): boolean => {
  return pushInfo != null;
};
