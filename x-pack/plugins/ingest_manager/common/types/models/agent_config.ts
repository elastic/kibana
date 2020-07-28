/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PackageConfig, PackageConfigPackage } from './package_config';
import { Output } from './output';

export enum AgentConfigStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export interface NewAgentConfig {
  name: string;
  namespace: string;
  description?: string;
  is_default?: boolean;
  monitoring_enabled?: Array<'logs' | 'metrics'>;
}

export interface AgentConfig extends NewAgentConfig {
  id: string;
  status: AgentConfigStatus;
  package_configs: string[] | PackageConfig[];
  updated_at: string;
  updated_by: string;
  revision: number;
}

export type AgentConfigSOAttributes = Omit<AgentConfig, 'id'>;

export interface FullAgentConfigInputStream {
  id: string;
  dataset: {
    name: string;
    type: string;
  };
  [key: string]: any;
}

export interface FullAgentConfigInput {
  id: string;
  name: string;
  type: string;
  dataset: { namespace: string };
  use_output: string;
  meta?: {
    package?: Pick<PackageConfigPackage, 'name' | 'version'>;
    [key: string]: unknown;
  };
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
  agent?: {
    monitoring: {
      use_output?: string;
      enabled: boolean;
      metrics: boolean;
      logs: boolean;
    };
  };
}
