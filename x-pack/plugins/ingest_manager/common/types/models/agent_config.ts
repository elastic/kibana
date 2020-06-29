/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Datasource, DatasourcePackage, DatasourceInputStream } from './datasource';
import { Output } from './output';

export enum AgentConfigStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export interface NewAgentConfig {
  name: string;
  namespace?: string;
  description?: string;
  is_default?: boolean;
  monitoring_enabled?: Array<'logs' | 'metrics'>;
}

export interface AgentConfig extends NewAgentConfig {
  id: string;
  status: AgentConfigStatus;
  datasources: string[] | Datasource[];
  updated_at: string;
  updated_by: string;
  revision: number;
}

export type AgentConfigSOAttributes = Omit<AgentConfig, 'id'>;

export type FullAgentConfigInputStream = Pick<DatasourceInputStream, 'id' | 'processors'> & {
  dataset: { name: string };
  [key: string]: any;
};

export interface FullAgentConfigInput {
  id: string;
  name: string;
  type: string;
  dataset: { namespace: string };
  use_output: string;
  package?: Pick<DatasourcePackage, 'name' | 'version'>;
  streams: FullAgentConfigInputStream[];
  [key: string]: any;
}

export interface FullAgentConfig {
  id: string;
  outputs: {
    [key: string]: Pick<Output, 'type' | 'hosts' | 'ca_sha256' | 'api_key'> & {
      [key: string]: any;
    };
  };
  inputs: FullAgentConfigInput[];
  revision?: number;
  settings?: {
    monitoring: {
      use_output?: string;
      enabled: boolean;
      metrics: boolean;
      logs: boolean;
    };
  };
}
