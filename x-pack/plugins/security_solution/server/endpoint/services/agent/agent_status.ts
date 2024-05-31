/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import {
  SENTINELONE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import type { Logger } from '@kbn/core/server';
import { keyBy, merge } from 'lodash';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { SentinelOneGetAgentsResponse } from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import { stringify } from '../../utils/stringify';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import type { AgentStatusInfo } from '../../../../common/endpoint/types';
import { HostStatus } from '../../../../common/endpoint/types';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';

export interface GetAgentStatusOptions {
  // NOTE: only sentinel_one currently supported
  agentType: ResponseActionAgentType;
  agentIds: string[];
  connectorActionsClient: ActionsClient;
  logger: Logger;
}
export const getSentinelOneAgentStatus = async ({
  agentType,
  agentIds,
  connectorActionsClient,
  logger,
}: GetAgentStatusOptions): Promise<AgentStatusInfo> => {
  let connectorList: ConnectorWithExtraFindData[] = [];

  try {
    connectorList = await connectorActionsClient.getAll();
  } catch (err) {
    throw new CustomHttpRequestError(
      `Unable to retrieve list of stack connectors: ${err.message}`,
      // failure here is likely due to Authz, but because we don't have a good way to determine that,
      // the `statusCode` below is set to `400` instead of `401`.
      400,
      err
    );
  }
  const connector = connectorList.find(({ actionTypeId, isDeprecated, isMissingSecrets }) => {
    return actionTypeId === SENTINELONE_CONNECTOR_ID && !isDeprecated && !isMissingSecrets;
  });

  if (!connector) {
    throw new CustomHttpRequestError(`No SentinelOne stack connector found`, 400, connectorList);
  }

  logger.debug(`Using SentinelOne stack connector: ${connector.name} (${connector.id})`);

  const agentDetailsResponse = (await connectorActionsClient.execute({
    actionId: connector.id,
    params: {
      subAction: SUB_ACTION.GET_AGENTS,
      subActionParams: {
        uuids: agentIds.filter((agentId) => agentId.trim().length).join(','),
      },
    },
  })) as ActionTypeExecutorResult<SentinelOneGetAgentsResponse>;

  if (agentDetailsResponse.status === 'error') {
    logger.error(stringify(agentDetailsResponse));

    throw new CustomHttpRequestError(
      `Attempt retrieve agent information from to SentinelOne failed: ${
        agentDetailsResponse.serviceMessage || agentDetailsResponse.message
      }`,
      500,
      agentDetailsResponse
    );
  }

  const agentDetailsById = keyBy(agentDetailsResponse.data?.data, 'uuid');

  logger.debug(`Response from SentinelOne API:\n${stringify(agentDetailsById)}`);

  return agentIds.reduce<AgentStatusInfo>((acc, agentId) => {
    const thisAgentDetails = agentDetailsById[agentId];
    const thisAgentStatus = {
      agentType,
      agentId,
      found: false,
      isolated: false,
      isPendingUninstall: false,
      isUninstalled: false,
      lastSeen: '',
      pendingActions: {
        execute: 0,
        upload: 0,
        unisolate: 0,
        isolate: 0,
        'get-file': 0,
        'kill-process': 0,
        'suspend-process': 0,
        'running-processes': 0,
      },
      status: HostStatus.UNENROLLED,
    };

    if (thisAgentDetails) {
      merge(thisAgentStatus, {
        found: true,
        lastSeen: thisAgentDetails.updatedAt,
        isPendingUninstall: thisAgentDetails.isPendingUninstall,
        isUninstalled: thisAgentDetails.isUninstalled,
        isolated: thisAgentDetails.networkStatus === SENTINEL_ONE_NETWORK_STATUS.DISCONNECTED,
        status: !thisAgentDetails.isActive ? HostStatus.OFFLINE : HostStatus.HEALTHY,
        pendingActions: {
          isolate:
            thisAgentDetails.networkStatus === SENTINEL_ONE_NETWORK_STATUS.DISCONNECTING ? 1 : 0,
          unisolate:
            thisAgentDetails.networkStatus === SENTINEL_ONE_NETWORK_STATUS.CONNECTING ? 1 : 0,
        },
      });
    }

    acc[agentId] = thisAgentStatus;

    return acc;
  }, {});
};

export enum SENTINEL_ONE_NETWORK_STATUS {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
}
