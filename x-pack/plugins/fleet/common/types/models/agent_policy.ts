/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { agentPolicyStatuses } from '../../constants';
import type { DataType, ValueOf } from '../../types';

import type { PackagePolicy, PackagePolicyPackage } from './package_policy';
import type { Output } from './output';

export type AgentPolicyStatus = typeof agentPolicyStatuses;

export interface NewAgentPolicy {
  name: string;
  namespace: string;
  description?: string;
  is_default?: boolean;
  is_default_fleet_server?: boolean; // Optional when creating a policy
  is_managed?: boolean; // Optional when creating a policy
  monitoring_enabled?: Array<ValueOf<DataType>>;
  is_preconfigured?: boolean;
}

export interface AgentPolicy extends NewAgentPolicy {
  id: string;
  status: ValueOf<AgentPolicyStatus>;
  package_policies: string[] | PackagePolicy[];
  is_managed: boolean; // required for created policy
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

export interface FullAgentPolicyOutputPermissions {
  [role: string]: {
    cluster: string[];
    indices: Array<{
      names: string[];
      privileges: string[];
    }>;
  };
}

export interface FullAgentPolicy {
  id: string;
  outputs: {
    [key: string]: Pick<Output, 'type' | 'hosts' | 'ca_sha256' | 'api_key'> & {
      [key: string]: any;
    };
  };
  output_permissions?: {
    [output: string]: FullAgentPolicyOutputPermissions;
  };
  fleet?:
    | {
        hosts: string[];
      }
    | {
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

// Generated from Fleet Server schema.json

/**
 * A policy that an Elastic Agent is attached to
 */
export interface FleetServerPolicy {
  /**
   * Date/time the policy revision was created
   */
  '@timestamp'?: string;
  /**
   * The ID of the policy
   */
  policy_id: string;
  /**
   * The revision index of the policy
   */
  revision_idx: number;
  /**
   * The coordinator index of the policy
   */
  coordinator_idx: number;
  /**
   * The opaque payload.
   */
  data: {
    [k: string]: unknown;
  };
  /**
   * True when this policy is the default policy to start Fleet Server
   */
  default_fleet_server: boolean;
}
