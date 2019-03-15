/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type AgentName =
  | 'go'
  | 'java'
  | 'js-base'
  | 'rum-js'
  | 'nodejs'
  | 'python'
  | 'ruby';

export interface Agent {
  name: AgentName;
  version: string;
}
