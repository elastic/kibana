/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatasourceSchema } from './datasource';

export enum AgentConfigStatus {
  Active = 'active',
  Inactive = 'inactive',
}

interface AgentConfigBaseSchema {
  name: string;
  namespace: string;
  description?: string;
}

export type NewAgentConfigSchema = AgentConfigBaseSchema;

export type AgentConfigSchema = AgentConfigBaseSchema & {
  id: string;
  status: AgentConfigStatus;
  datasources: Array<string | DatasourceSchema>;
  updated_on: string;
  updated_by: string;
};

export type NewAgentConfig = NewAgentConfigSchema;

export type AgentConfig = AgentConfigSchema;
