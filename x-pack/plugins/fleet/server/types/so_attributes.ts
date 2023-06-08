/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Definitions for SO attributes. They mirror the types defined under /common/types/models
import type { agentPolicyStatuses } from '../../common/constants';
import type {
  MonitoringType,
  ValueOf,
  AgentMetadata,
  OutputType,
  ShipperOutput,
} from '../../common/types';
import type { AgentType, FleetServerAgentComponent } from '../../common/types/models';

import type {
  PackagePolicy,
  PackagePolicyInput,
  PackagePolicyPackage,
  PackagePolicyConfigRecord,
} from '../../common/types/models/package_policy';
import type { PolicySecretReference } from '../../common/types/models/secret';

export type AgentPolicyStatus = typeof agentPolicyStatuses;

export interface AgentPolicySOAttributes {
  name: string;
  namespace: string;
  is_managed: boolean; // required for created policy
  updated_at: string;
  updated_by: string;
  revision: number;
  is_protected: boolean;
  description?: string;
  is_default?: boolean;
  is_default_fleet_server?: boolean; // Optional when creating a policy
  has_fleet_server?: boolean;
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
  status: ValueOf<AgentPolicyStatus>;
  package_policies?: PackagePolicy[];
  agents?: number;
}

export interface AgentSOAttributes {
  type: AgentType;
  active: boolean;
  enrolled_at: string;
  user_provided_metadata: AgentMetadata;
  local_metadata: AgentMetadata;
  unenrolled_at?: string;
  unenrollment_started_at?: string;
  upgraded_at?: string | null;
  upgrade_started_at?: string | null;
  access_api_key_id?: string;
  default_api_key?: string;
  default_api_key_id?: string;
  policy_id?: string;
  policy_revision?: number | null;
  last_checkin?: string;
  last_checkin_status?: 'error' | 'online' | 'degraded' | 'updating';
  last_checkin_message?: string;
  tags?: string[];
  components?: FleetServerAgentComponent[];
  packages?: string[];
}

export interface FleetProxySOAttributes {
  name: string;
  url: string;
  is_preconfigured: boolean;
  certificate_authorities?: string | null;
  certificate?: string | null;
  certificate_key?: string | null;
  proxy_headers?: string | null;
}

export interface FleetServerHostSOAttributes {
  name: string;
  host_urls: string[];
  is_default: boolean;
  is_preconfigured: boolean;
  proxy_id?: string | null;
}

export interface PackagePolicySOAttributes {
  name: string;
  namespace: string;
  enabled: boolean;
  revision: number;
  created_at: string;
  created_by: string;
  inputs: PackagePolicyInput[];
  policy_id: string;
  updated_at: string;
  updated_by: string;
  description?: string;
  is_managed?: boolean;
  secret_references?: PolicySecretReference[];
  package?: PackagePolicyPackage;
  vars?: PackagePolicyConfigRecord;
  elasticsearch?: {
    privileges?: {
      cluster?: string[];
    };
  };
  agents?: number;
}

export interface OutputSOAttributes {
  is_default: boolean;
  is_default_monitoring: boolean;
  name: string;
  type: ValueOf<OutputType>;
  hosts?: string[];
  ca_sha256?: string | null;
  ca_trusted_fingerprint?: string | null;
  is_preconfigured?: boolean;
  config_yaml?: string | null;
  proxy_id?: string | null;
  shipper?: ShipperOutput | null;
  allow_edit?: string[];
  output_id?: string;
  ssl?: string | null; // encrypted ssl field
}

export interface SettingsSOAttributes {
  has_seen_add_data_notice?: boolean;
  fleet_server_hosts?: string[];
  prerelease_integrations_enabled: boolean;
}
