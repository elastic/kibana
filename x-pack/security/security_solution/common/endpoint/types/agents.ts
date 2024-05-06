/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostStatus } from '.';
import type {
  ResponseActionsApiCommandNames,
  ResponseActionAgentType,
} from '../service/response_actions/constants';

export interface AgentStatusInfo {
  id: string;
  agentType: ResponseActionAgentType;
  found: boolean;
  isolated: boolean;
  isPendingUninstall: boolean;
  isUninstalled: boolean;
  lastSeen: string; // ISO date
  pendingActions: Record<ResponseActionsApiCommandNames, number>;
  status: HostStatus;
}

export interface AgentStatusApiResponse {
  data: Record<string, AgentStatusInfo>;
}
