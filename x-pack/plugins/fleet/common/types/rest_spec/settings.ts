/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Settings, AgentPolicy, FleetServerHost, FleetProxy, DownloadSource } from '../models';

export interface GetSettingsResponse {
  item: Settings;
}

export interface PutSettingsRequest {
  body: Partial<Omit<Settings, 'id'>>;
}

export interface PutSettingsResponse {
  item: Settings;
}

export interface GetEnrollmentSettingsRequest {
  query: {
    agentPolicyId?: string;
  };
}

export type EnrollmentSettingsFleetServerPolicy = Pick<
  AgentPolicy,
  | 'id'
  | 'name'
  | 'is_managed'
  | 'is_default_fleet_server'
  | 'has_fleet_server'
  | 'fleet_server_host_id'
  | 'download_source_id'
  | 'space_ids'
>;

export interface GetEnrollmentSettingsResponse {
  fleet_server: {
    policies: EnrollmentSettingsFleetServerPolicy[];
    has_active: boolean;
    host?: FleetServerHost;
    host_proxy?: FleetProxy;
  };
  download_source?: DownloadSource;
}
export interface PutSpaceSettingsRequest {
  body: {
    allowed_namespace_prefixes?: string[];
  };
}

export interface GetSpaceSettingsResponse {
  item: {
    allowed_namespace_prefixes?: string[];
  };
}
