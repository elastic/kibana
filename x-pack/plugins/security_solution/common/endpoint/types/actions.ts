/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { HostIsolationRequestSchema } from '../schema/actions';

export type ISOLATION_ACTIONS = 'isolate' | 'unisolate';

export interface EndpointAction {
  action_id: string;
  '@timestamp': string;
  expiration: string;
  type: 'INPUT_ACTION';
  input_type: 'endpoint';
  agents: string[];
  user_id: string;
  data: {
    command: ISOLATION_ACTIONS;
    comment?: string;
  };
}

export interface EndpointActionResponse {
  '@timestamp': string;
  /** The id of the action for which this response is associated with */
  action_id: string;
  /** The agent id that sent this action response */
  agent_id: string;
  started_at: string;
  completed_at: string;
  error: string;
  action_data: {
    command: ISOLATION_ACTIONS;
    comment?: string;
  };
}

export type HostIsolationRequestBody = TypeOf<typeof HostIsolationRequestSchema.body>;

export interface HostIsolationResponse {
  action: string;
}
