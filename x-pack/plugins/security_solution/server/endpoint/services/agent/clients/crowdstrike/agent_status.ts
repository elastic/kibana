/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import { keyBy, merge } from 'lodash';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';

import type {
  CrowdstrikeGetAgentsResponse,
  CrowdstrikeGetAgentOnlineStatusResponse,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import {
  CROWDSTRIKE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';
import { stringify } from '../../../../utils/stringify';
import type { AgentStatusInfo } from '../../../../../../common/endpoint/types';
import { HostStatus } from '../../../../../../common/endpoint/types';
import { CustomHttpRequestError } from '../../../../../utils/custom_http_request_error';
import {
  CROWDSTRIKE_NETWORK_STATUS,
  CROWDSTRIKE_STATUS_RESPONSE,
} from './crowdstrike_one_agent_status_client';
import type { GetAgentStatusOptions } from '../lib/types';

export const getCrowdstrikeAgentStatus = async ({
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
    return actionTypeId === CROWDSTRIKE_CONNECTOR_ID && !isDeprecated && !isMissingSecrets;
  });

  if (!connector) {
    throw new CustomHttpRequestError(`No Crowdstrike stack connector found`, 400, connectorList);
  }

  logger.debug(`Using Crowdstrike stack connector: ${connector.name} (${connector.id})`);
  let agentDetailsResponse;
  let agentOnlineStatus;
  try {
    // HOST DETAILS provide information about containment status
    agentDetailsResponse = (await connectorActionsClient.execute({
      actionId: connector.id,
      params: {
        subAction: SUB_ACTION.GET_AGENT_DETAILS,
        subActionParams: {
          ids: agentIds,
        },
      },
    })) as ActionTypeExecutorResult<CrowdstrikeGetAgentsResponse>;

    // AGENT STATUS provides information about the online status
    agentOnlineStatus = (await connectorActionsClient.execute({
      actionId: connector.id,
      params: {
        subAction: SUB_ACTION.GET_AGENT_ONLINE_STATUS,
        subActionParams: {
          ids: agentIds,
        },
      },
    })) as ActionTypeExecutorResult<CrowdstrikeGetAgentOnlineStatusResponse>;
  } catch (error) {
    throw new CrowdstrikeError(error.message);
  }

  const agentDetailsById = keyBy(agentDetailsResponse.data?.resources, 'device_id');
  const agentOnlineStatusById = keyBy(agentOnlineStatus.data?.resources, 'id');

  logger.debug(`Response from Crowdstrike API:\n${stringify(agentDetailsById)}`);

  return agentIds.reduce<AgentStatusInfo>((acc, agentId) => {
    const thisAgentDetails = agentDetailsById[agentId];
    const thisAgentOnlineStatusById = agentOnlineStatusById[agentId];
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
        lastSeen: thisAgentDetails.last_seen,
        // TODO TC: Does uninstall mean unenrolled / unprovisioned? This is hard to figure out from the Crowdstrike DOCS ;/
        // isPendingUninstall: thisAgentDetails.isPendingUninstall,
        // isUninstalled: thisAgentDetails.isUninstalled,
        isolated: thisAgentDetails.status === CROWDSTRIKE_NETWORK_STATUS.CONTAINED,
        status:
          thisAgentOnlineStatusById.state === CROWDSTRIKE_STATUS_RESPONSE.ONLINE
            ? HostStatus.HEALTHY
            : thisAgentOnlineStatusById.state === CROWDSTRIKE_STATUS_RESPONSE.OFFLINE
            ? HostStatus.OFFLINE
            : HostStatus.UNENROLLED,
        pendingActions: {
          isolate:
            thisAgentDetails.status === CROWDSTRIKE_NETWORK_STATUS.CONTAINMENT_PENDING ? 1 : 0,
          unisolate:
            thisAgentDetails.status === CROWDSTRIKE_NETWORK_STATUS.LIFT_CONTAINMENT_PENDING ? 1 : 0,
        },
      });
    }

    acc[agentId] = thisAgentStatus;

    return acc;
  }, {});
};
