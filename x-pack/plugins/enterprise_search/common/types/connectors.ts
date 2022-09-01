/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface KeyValuePair {
  label: string;
  value: string;
}

export type ConnectorConfiguration = Record<string, KeyValuePair | null>;
export interface ConnectorScheduling {
  enabled: boolean;
  interval: string;
}

export enum ConnectorStatus {
  CREATED = 'created',
  NEEDS_CONFIGURATION = 'needs_configuration',
  CONFIGURED = 'configured',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export enum SyncStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ERROR = 'error',
}
export interface Connector {
  api_key_id: string | null;
  configuration: ConnectorConfiguration;
  id: string;
  index_name: string;
  language: string | null;
  last_seen: string | null;
  last_sync_error: string | null;
  last_sync_status: string | null;
  last_synced: string | null;
  name: string;
  scheduling: {
    enabled: boolean;
    interval: string; // crontab syntax
  };
  service_type: string | null;
  status: ConnectorStatus;
  sync_now: boolean;
}

export type ConnectorDocument = Omit<Connector, 'id'>;
