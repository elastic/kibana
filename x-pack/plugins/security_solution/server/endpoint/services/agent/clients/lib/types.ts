/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import type { HostStatus } from '../../../../../../common/endpoint/types';

export interface RawSentinelOneInfo {
  sentinel_one: {
    agent: {
      uuid: string;
      last_active_date: string;
      network_status: string;
      is_active: boolean;
      is_pending_uninstall: boolean;
      is_uninstalled: boolean;
    };
  };
}

export interface AgentStatuses {
  [agentId: string]: {
    agentId: string;
    agentType: ResponseActionAgentType;
    found: boolean;
    isolated: boolean;
    isPendingUninstall: boolean | undefined;
    isUninstalled: boolean | undefined;
    lastSeen: string; // ISO date
    pendingActions:
      | Record<ResponseActionsApiCommandNames, number>
      | {
          [key: string]: number;
        };
    status: HostStatus;
  };
}

export interface AgentStatusClientInterface {
  getAgentStatuses: (agentIds: string[]) => Promise<AgentStatuses>;
}
