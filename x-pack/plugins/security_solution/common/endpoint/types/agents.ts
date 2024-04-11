/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostStatus } from '.';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../service/response_actions/constants';

export interface AgentStatusRecords {
  [agentId: string]: {
    agentId: string;
    agentType: ResponseActionAgentType;
    found: boolean;
    isolated: boolean;
    lastSeen: string; // ISO date
    pendingActions: Record<ResponseActionsApiCommandNames | string, number>;
    status: HostStatus;
  };
}

// TODO: remove when agentStatusClientEnabled is enabled/removed
export interface AgentStatusInfo {
  [agentId: string]: AgentStatusRecords[string] & {
    isPendingUninstall: boolean;
    isUninstalled: boolean;
  };
}
