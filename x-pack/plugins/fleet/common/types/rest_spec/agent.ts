/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@kbn/es-types';

import type {
  Agent,
  AgentAction,
  ActionStatus,
  CurrentUpgrade,
  NewAgentAction,
  AgentDiagnostics,
} from '../models';

import type { ListResult, ListWithKuery } from './common';

export interface GetAgentsRequest {
  query: ListWithKuery & {
    showInactive: boolean;
    showUpgradeable?: boolean;
  };
}

export interface GetAgentsResponse extends ListResult<Agent> {
  totalInactive: number;
  // deprecated in 8.x
  list?: Agent[];
}

export interface GetAgentTagsResponse {
  items: string[];
}

export interface GetOneAgentRequest {
  params: {
    agentId: string;
  };
}

export interface GetOneAgentResponse {
  item: Agent;
}

export interface GetAgentUploadsResponse {
  items: AgentDiagnostics[];
}

export interface PostNewAgentActionRequest {
  body: {
    action: Omit<NewAgentAction, 'agents'>;
  };
  params: {
    agentId: string;
  };
}

export interface PostNewAgentActionResponse {
  item: AgentAction;
}

export interface PostAgentUnenrollRequest {
  params: {
    agentId: string;
  };
  body: {
    force?: boolean;
    revoke?: boolean;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PostAgentUnenrollResponse {}

export interface PostBulkAgentUnenrollRequest {
  body: {
    agents: string[] | string;
    force?: boolean;
    revoke?: boolean;
  };
}

export interface BulkAgentAction {
  actionId: string;
}

export type PostBulkAgentUnenrollResponse = BulkAgentAction;

export interface PostAgentUpgradeRequest {
  params: {
    agentId: string;
  };
  body: {
    source_uri?: string;
    version: string;
  };
}

export interface PostBulkAgentUpgradeRequest {
  body: {
    agents: string[] | string;
    source_uri?: string;
    version: string;
    rollout_duration_seconds?: number;
    start_time?: string;
  };
}

export type PostBulkAgentUpgradeResponse = BulkAgentAction;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PostAgentUpgradeResponse {}

export interface PutAgentReassignRequest {
  params: {
    agentId: string;
  };
  body: { policy_id: string };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PutAgentReassignResponse {}

export interface PostBulkAgentReassignRequest {
  body: {
    policy_id: string;
    agents: string[] | string;
    batchSize?: number;
  };
}

export type PostRequestDiagnosticsResponse = BulkAgentAction;
export type PostBulkRequestDiagnosticsResponse = BulkAgentAction;

export interface PostRequestBulkDiagnosticsRequest {
  body: {
    agents: string[] | string;
    batchSize?: number;
  };
}

export type PostBulkAgentReassignResponse = BulkAgentAction;

export type PostBulkUpdateAgentTagsResponse = BulkAgentAction;

export interface DeleteAgentRequest {
  params: {
    agentId: string;
  };
}

export interface UpdateAgentRequest {
  params: {
    agentId: string;
  };
  body: {
    user_provided_metadata?: Record<string, any>;
    tags?: string[];
  };
}

export interface PostBulkUpdateAgentTagsRequest {
  body: {
    agents: string[] | string;
    tagsToAdd?: string[];
    tagsToRemove?: string[];
  };
}

export interface GetAgentStatusRequest {
  query: {
    kuery?: string;
    policyId?: string;
  };
}

export interface GetAgentStatusResponse {
  results: {
    events: number;
    total: number;
    online: number;
    error: number;
    offline: number;
    other: number;
    updating: number;
    inactive: number;
    unenrolled: number;
  };
}

export interface GetAgentIncomingDataRequest {
  query: {
    agentsIds: string[];
    previewData?: boolean;
  };
}

export interface IncomingDataList {
  [key: string]: { data: boolean };
}
export interface GetAgentIncomingDataResponse {
  items: IncomingDataList[];
  dataPreview: SearchHit[];
}

export interface GetCurrentUpgradesResponse {
  items: CurrentUpgrade[];
}
export interface GetActionStatusResponse {
  items: ActionStatus[];
}
export interface GetAvailableVersionsResponse {
  items: string[];
}
