/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { ActionStatusRequestSchema, HostIsolationRequestSchema } from '../schema/actions';

export type ISOLATION_ACTIONS = 'isolate' | 'unisolate';

export interface EndpointActionData {
  command: ISOLATION_ACTIONS;
  comment?: string;
}

export interface EndpointAction {
  action_id: string;
  '@timestamp': string;
  expiration: string;
  type: 'INPUT_ACTION';
  input_type: 'endpoint';
  agents: string[];
  user_id: string;
  data: EndpointActionData;
}

export interface EndpointActionResponse {
  '@timestamp': string;
  /** The id of the action for which this response is associated with */
  action_id: string;
  /** The agent id that sent this action response */
  agent_id: string;
  started_at: string;
  completed_at: string;
  error?: string;
  action_data: EndpointActionData;
}

export interface ActivityLogAction {
  type: 'action';
  item: {
    // document _id
    id: string;
    // document _source
    data: EndpointAction;
  };
}
export interface ActivityLogActionResponse {
  type: 'response';
  item: {
    // document id
    id: string;
    // document _source
    data: EndpointActionResponse;
  };
}
export type ActivityLogEntry = ActivityLogAction | ActivityLogActionResponse;
export interface ActivityLog {
  total: number;
  page: number;
  pageSize: number;
  data: ActivityLogEntry[];
}

export type HostIsolationRequestBody = TypeOf<typeof HostIsolationRequestSchema.body>;

export interface HostIsolationResponse {
  action: string;
}

export interface EndpointPendingActions {
  agent_id: string;
  pending_actions: {
    /** Number of actions pending for each type. The `key` could be one of the `ISOLATION_ACTIONS` values. */
    [key: string]: number;
  };
}

export interface PendingActionsResponse {
  data: EndpointPendingActions[];
}

export type PendingActionsRequestQuery = TypeOf<typeof ActionStatusRequestSchema.query>;
