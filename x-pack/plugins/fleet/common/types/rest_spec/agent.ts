/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@kbn/core/types/elasticsearch';

import type { Agent, AgentAction, CurrentUpgrade, NewAgentAction } from '../models';

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

export interface GetOneAgentRequest {
  params: {
    agentId: string;
  };
}

export interface GetOneAgentResponse {
  item: Agent;
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

export type PostBulkAgentUnenrollResponse = Record<
  Agent['id'],
  {
    success: boolean;
    error?: string;
  }
>;

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

export type PostBulkAgentUpgradeResponse = Record<
  Agent['id'],
  {
    success: boolean;
    error?: string;
  }
>;

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
  };
}

export type PostBulkAgentReassignResponse = Record<
  Agent['id'],
  {
    success: boolean;
    error?: string;
  }
>;

export type PostBulkUpdateAgentTagsResponse = Record<
  Agent['id'],
  {
    success: boolean;
    error?: string;
  }
>;

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
