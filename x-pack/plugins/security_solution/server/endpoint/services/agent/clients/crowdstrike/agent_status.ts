/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import type { AgentStatusInfo } from '../../../../../../common/endpoint/types';
import { HostStatus } from '../../../../../../common/endpoint/types';
import {
  CROWDSTRIKE_NETWORK_STATUS,
  CROWDSTRIKE_STATUS_RESPONSE,
} from './crowdstrike_agent_status_client';
import type { GetAgentStatusOptions } from '../lib/types';
import { NormalizedExternalConnectorClient } from '../../../actions/clients/lib/normalized_external_connector_client';

export const getCrowdstrikeAgentStatus = async ({
  agentType,
  agentIds,
  connectorActionsClient,
  logger,
}: GetAgentStatusOptions): Promise<AgentStatusInfo> => {
  const connectorActions = new NormalizedExternalConnectorClient(connectorActionsClient, logger);
  connectorActions.setup(CROWDSTRIKE_CONNECTOR_ID);

  let agentDetailsResponse;
  let agentOnlineStatus;
  try {
    // HOST DETAILS provide information about containment status
    agentDetailsResponse = (await connectorActions.execute({
      params: {
        subAction: SUB_ACTION.GET_AGENT_DETAILS,
        subActionParams: {
          ids: agentIds,
        },
      },
    })) as ActionTypeExecutorResult<CrowdstrikeGetAgentsResponse>;

    // AGENT STATUS provides information about the online status
    agentOnlineStatus = (await connectorActions.execute({
      params: {
        subAction: SUB_ACTION.GET_AGENT_ONLINE_STATUS,
        subActionParams: {
          ids: agentIds,
        },
      },
    })) as ActionTypeExecutorResult<CrowdstrikeGetAgentOnlineStatusResponse>;
  } catch (error) {
    throw new Error(error.message);
  }

  const agentDetailsById = keyBy(agentDetailsResponse.data?.resources, 'device_id');
  const agentOnlineStatusById = keyBy(agentOnlineStatus.data?.resources, 'id');

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
