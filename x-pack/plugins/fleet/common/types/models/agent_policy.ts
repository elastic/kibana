/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { agentPolicyStatuses } from '../../constants';
import { DataType, ValueOf } from '../../types';
import { PackagePolicy, PackagePolicyPackage } from './package_policy';
import { Output } from './output';

export type AgentPolicyStatus = typeof agentPolicyStatuses;

export interface NewAgentPolicy {
  name: string;
  namespace: string;
  description?: string;
  is_default?: boolean;
  monitoring_enabled?: Array<ValueOf<DataType>>;
}

export interface AgentPolicy extends NewAgentPolicy {
  id: string;
  status: ValueOf<AgentPolicyStatus>;
  package_policies: string[] | PackagePolicy[];
  updated_at: string;
  updated_by: string;
  revision: number;
}

export type AgentPolicySOAttributes = Omit<AgentPolicy, 'id'>;

export interface FullAgentPolicyInputStream {
  id: string;
  data_stream: {
    dataset: string;
    type: string;
  };
  [key: string]: any;
}

export interface FullAgentPolicyInput {
  id: string;
  name: string;
  revision: number;
  type: string;
  data_stream: { namespace: string };
  use_output: string;
  meta?: {
    package?: Pick<PackagePolicyPackage, 'name' | 'version'>;
    [key: string]: unknown;
  };
  streams?: FullAgentPolicyInputStream[];
  [key: string]: any;
}

export interface FullAgentPolicy {
  id: string;
  outputs: {
    [key: string]: Pick<Output, 'type' | 'hosts' | 'ca_sha256' | 'api_key'> & {
      [key: string]: any;
    };
  };
  fleet?: {
    kibana: FullAgentPolicyKibanaConfig;
  };
  inputs: FullAgentPolicyInput[];
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

export interface FullAgentPolicyKibanaConfig {
  hosts: string[];
  protocol: string;
  path?: string;
}
