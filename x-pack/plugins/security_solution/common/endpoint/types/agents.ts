/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostStatus } from '.';
import type {
  ResponseActionAgentType,
  EDRActionsApiCommandNames,
} from '../service/response_actions/constants';

export interface AgentStatusInfo {
  agentId: string;
  agentType: ResponseActionAgentType;
  found: boolean;
  isolated: boolean;
  lastSeen: string; // ISO date
  pendingActions: Record<EDRActionsApiCommandNames<'endpoint'> | string, number>;
  status: HostStatus;
}

export interface AgentStatusRecords {
  [agentId: string]: AgentStatusInfo;
}

export interface AgentStatusApiResponse {
  data: AgentStatusRecords;
}
