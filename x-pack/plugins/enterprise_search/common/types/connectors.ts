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
  CANCELING = 'canceling',
  CANCELED = 'canceled',
  COMPLETED = 'completed',
  ERROR = 'error',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

export interface IngestPipelineParams {
  extract_binary_content: boolean;
  name: string;
  reduce_whitespace: boolean;
  run_ml_inference: boolean;
}

export enum FilteringPolicy {
  EXCLUDE = 'exclude',
  INCLUDE = 'include',
}

export enum FilteringRuleRule {
  CONTAINS = 'contains',
  ENDS_WITH = 'ends_with',
  EQUALS = 'equals',
  GT = '>',
  LT = '<',
  REGEX = 'regex',
  STARTS_WITH = 'starts_with',
}

export interface FilteringRule {
  created_at: string;
  field: string;
  id: string;
  order: number;
  policy: FilteringPolicy;
  rule: FilteringRuleRule;
  updated_at: string;
  value: string;
}

export interface FilteringValidation {
  ids: string[];
  messages: string[];
}

export enum FilteringValidationState {
  EDITED = 'edited',
  INVALID = 'invalid',
  VALID = 'valid',
}

export interface FilteringRules {
  advanced_snippet: {
    created_at: string;
    updated_at: string;
    value: Record<string, unknown>;
  };
  rules: FilteringRule[];
  validation: {
    errors: FilteringValidation[];
    state: FilteringValidationState;
  };
}

export interface FilteringConfig {
  active: FilteringRules;
  domain: string;
  draft: FilteringRules;
}

export enum TriggerMethod {
  ON_DEMAND = 'on_demand',
  SCHEDULED = 'scheduled',
}

export enum FeatureName {
  FILTERING_ADVANCED_CONFIG = 'filtering_advanced_config',
  FILTERING_RULES = 'filtering_rules',
}

export interface Connector {
  api_key_id: string | null;
  configuration: ConnectorConfiguration;
  description: string | null;
  error: string | null;
  features: Partial<Record<FeatureName, boolean>> | null;
  filtering: FilteringConfig[];
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
  cancelation_requested_at: string | null;
  canceled_at: string | null;
  completed_at: string | null;
  connector: {
    configuration: ConnectorConfiguration;
    filtering: FilteringRules[] | null;
    id: string;
    index_name: string;
    language: string;
    pipeline: IngestPipelineParams | null;
    service_type: string;
  };
  created_at: string;
  deleted_document_count: number;
  error: string | null;
  id: string;
  indexed_document_count: number;
  indexed_document_volume: number;
  last_seen: string;
  metadata: Record<string, unknown>;
  started_at: string;
  status: SyncStatus;
  trigger_method: TriggerMethod;
  worker_hostname: string;
}

export type ConnectorSyncJobDocument = Omit<ConnectorSyncJob, 'id'>;

export interface NativeConnector {
  configuration: ConnectorConfiguration;
  features: Connector['features'];
  name: string;
  serviceType: string;
}
