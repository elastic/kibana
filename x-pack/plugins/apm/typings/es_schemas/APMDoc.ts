/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// agent names can be any string. This list only defines the official agents that we might want to
// target specifically eg. linking to their documentation
export type AgentName =
  | 'java'
  | 'nodejs'
  | 'python'
  | 'ruby'
  | 'js-react'
  | 'js-base';

// all documents types extend APMDoc and inherit all properties
export interface APMDoc {
  '@timestamp': string;
  agent: {
    name: AgentName;
    version: string;
  };
  timestamp: { us: number };
  parent?: { id: string }; // parent ID is not available on root transactions
  trace: { id: string };
  labels?: {
    [key: string]: string | number | boolean;
  };
}
