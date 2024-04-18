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

export interface GetEnrollmentSettingsResponse {
  fleet_server: {
    agent_policies: Array<
      Pick<AgentPolicy, 'id' | 'name' | 'fleet_server_host_id' | 'download_source_id'>
    >;
    has_active: boolean;
    host?: FleetServerHost;
    host_proxy?: FleetProxy;
  };
  download_source?: DownloadSource;
}
