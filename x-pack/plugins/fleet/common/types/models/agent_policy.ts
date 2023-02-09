/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { agentPolicyStatuses } from '../../constants';
import type { MonitoringType, ValueOf } from '..';

import type { PackagePolicy, PackagePolicyPackage } from './package_policy';
import type { Output } from './output';

export type AgentPolicyStatus = typeof agentPolicyStatuses;

export interface NewAgentPolicy {
  id?: string;
  name: string;
  namespace: string;
  description?: string;
  is_default?: boolean;
  is_default_fleet_server?: boolean; // Optional when creating a policy
  has_fleet_server?: boolean;
  is_managed?: boolean; // Optional when creating a policy
  monitoring_enabled?: MonitoringType;
  unenroll_timeout?: number;
  inactivity_timeout?: number;
  is_preconfigured?: boolean;
  // Nullable to allow user to reset to default outputs
  data_output_id?: string | null;
  monitoring_output_id?: string | null;
  download_source_id?: string | null;
  fleet_server_host_id?: string | null;
  schema_version?: string;
  agent_features?: Array<{ name: string; enabled: boolean }>;
}

export interface AgentPolicy extends Omit<NewAgentPolicy, 'id'> {
  id: string;
  status: ValueOf<AgentPolicyStatus>;
  package_policies?: PackagePolicy[];
  is_managed: boolean; // required for created policy
  updated_at: string;
  updated_by: string;
  revision: number;
  agents?: number;
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
  package_policy_id: string;
  meta?: {
    package?: Pick<PackagePolicyPackage, 'name' | 'version'>;
    [key: string]: unknown;
  };
  streams?: FullAgentPolicyInputStream[];
  [key: string]: any;
}

export interface FullAgentPolicyOutputPermissions {
  [packagePolicyName: string]: {
    cluster?: string[];
    indices?: Array<{
      names: string[];
      privileges: string[];
    }>;
  };
}

export type FullAgentPolicyOutput = Pick<Output, 'type' | 'hosts' | 'ca_sha256'> & {
  proxy_url?: string;
  proxy_headers?: any;
  [key: string]: any;
};

export interface FullAgentPolicy {
  id: string;
  outputs: {
    [key: string]: FullAgentPolicyOutput;
  };
  output_permissions?: {
    [output: string]: FullAgentPolicyOutputPermissions;
  };
  fleet?:
    | FullAgentPolicyFleetConfig
    | {
        kibana: FullAgentPolicyKibanaConfig;
      };
  inputs: FullAgentPolicyInput[];
  revision?: number;
  agent?: {
    monitoring: {
      namespace?: string;
      use_output?: string;
      enabled: boolean;
      metrics: boolean;
      logs: boolean;
    };
    download: { sourceURI: string };
    features: Record<string, { enabled: boolean }>;
  };
}

export interface FullAgentPolicyFleetConfig {
  hosts: string[];
  proxy_url?: string;
  proxy_headers?: any;
  ssl?: {
    verification_mode?: string;
    certificate_authorities?: string[];
    renegotiation?: string;
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
  /**
   * Auto unenroll any Elastic Agents which have not checked in for this many seconds
   */
  unenroll_timeout?: number;
  /**
   * Mark agents as inactive if they have not checked in for this many seconds
   */
  inactivity_timeout?: number;
}
