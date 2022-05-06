/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type HintStatus = 'complete' | 'error';
export interface Hint {
  _id: string;
  agent_id: string;
  last_updated?: number;
  received_at?: number;
  status?: HintStatus;
  result?: {
    agent_policy_id?: string;
    package_policy_id?: string;
    package?: {
      name: string;
      version: string;
    };
  };
  type: string;
  namespace_uid: string;
  node: {
    hostname: string;
    name: string;
    ud: string;
    labels: string;
  };
  kubernetes: {
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    namespace: string;
    pod: {
      ip: string;
      name: string;
      uid: string;
    };
    container: {
      id: string;
      image: string;
      name: string;
      port: string;
      port_name: string;
      runtime: string;
    };
  };
}
