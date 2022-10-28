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

export interface IngestPipelineParams {
  extract_binary_content: boolean;
  name: string;
  reduce_whitespace: boolean;
  run_ml_inference: boolean;
}

export interface FilteringRule {
  created_at: string;
  field: string;
  id: string;
  order: number;
  policy: string;
  rule: string;
  updated_at: string;
  value: string;
}

export interface FilteringValidation {
  ids: string[];
  messages: string[];
}

export interface FilteringRules {
  advanced_snippet: {
    created_at: string;
    updated_at: string;
    value: object;
  };
  rules: FilteringRule[];
  validation: {
    errors: FilteringValidation[];
    state: string;
  };
}

export interface FilteringConfig {
  active: FilteringRules;
  domain: string;
  draft: FilteringRules;
}

export interface Connector {
  api_key_id: string | null;
  configuration: ConnectorConfiguration;
  description: string | null;
  error: string | null;
  filtering: FilteringConfig[] | null;
  id: string;
  index_name: string;
  is_native: boolean;
  language: string | null;
  last_seen: string | null;
  last_sync_error: string | null;
  last_sync_status: SyncStatus | null;
  last_synced: string | null;
  name: string;
  pipeline?: IngestPipelineParams | null;
  scheduling: {
    enabled: boolean;
    interval: string; // crontab syntax
  };
  service_type: string | null;
  status: ConnectorStatus;
  sync_now: boolean;
}

export type ConnectorDocument = Omit<Connector, 'id'>;

export interface ConnectorSyncJob {
  completed_at: string | null;
  connector?: ConnectorDocument;
  connector_id: string;
  created_at: string;
  deleted_document_count: number;
  error: string | null;
  index_name: string;
  indexed_document_count: number;
  status: SyncStatus;
  worker_hostname: string;
}
