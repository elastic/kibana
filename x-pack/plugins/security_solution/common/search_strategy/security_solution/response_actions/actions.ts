/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type {
  Direction,
  Inspect,
  Maybe,
  RequestBasicOptions,
  ResponseActionsSearchHit,
} from './types';

export interface ActionRequestOptions extends RequestBasicOptions {
  alertIds: string[];
  agentId?: string;
  sort: {
    direction: Direction;
    field: string;
  };
}

export interface ActionRequestStrategyResponse extends IEsSearchResponse {
  edges: ResponseActionsSearchHit[];
  inspect?: Maybe<Inspect>;
}

export interface LogsOsqueryAction {
  '@timestamp': string;
  action_id: string;
  alert_ids: string[];
  expiration: string;
  input_type: 'osquery';
  queries: Array<{
    action_id: string;
    id: string;
    query: string;
    agents: string[];
    ecs_mapping?: unknown;
    version?: string;
    platform?: string;
    saved_query_id?: string;
    expiration?: string;
  }>;
  type: ' "INPUT_ACTION';
}
