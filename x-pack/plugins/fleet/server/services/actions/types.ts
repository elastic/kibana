/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface CommonFleetActionResponseDocFields {
  '@timestamp': string;
  action_id: string;
  data: object;
}

export interface FleetAction extends CommonFleetActionResponseDocFields {
  agents: string[];
  expiration: string;
  input_type: string;
  minimum_execution_duration: number;
  rollout_duration_seconds: number;
  signed: {
    data: string;
    signature: string;
  };
  start_time: string;
  timeout: number;
  type: string;
  user_id: string;
}

export interface FleetActionResponse extends CommonFleetActionResponseDocFields {
  '@timestamp': string;
  action_data: object;
  action_id: string;
  action_input_type: string;
  action_response: {
    endpoint: {
      ack: boolean;
    };
  };
  agent_id: string;
  completed_at: string;
  error: string;
  started_at: string;
}
