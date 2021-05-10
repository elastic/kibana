/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export interface HostIsolationResponse {
  action?: string;
  message?: string;
}
