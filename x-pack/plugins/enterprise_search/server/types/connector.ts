/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface KeyValuePair {
  label: string;
  value: string | null;
}

export type ConnectorConfiguration = Record<string, KeyValuePair | undefined>;
export interface ConnectorScheduling {
  enabled: boolean;
  interval: string;
}

export interface Connector {
  api_key_id: string | null;
  configuration: ConnectorConfiguration;
  created_at: string | null;
  index_name: string;
  last_seen: string | null;
  last_synced: string | null;
  scheduling: ConnectorScheduling;
  service_type: string | null;
  status: string | null;
  sync_error: string | null;
  sync_now: boolean;
  sync_status: string | null;
}
