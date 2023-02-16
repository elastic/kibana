/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEvent, ResolverNode, SafeResolverEvent } from '../../../common/endpoint/types';
import type { AllowlistFields } from './filterlists/types';

type BaseSearchTypes = string | number | boolean | object;
export type SearchTypes = BaseSearchTypes | BaseSearchTypes[] | undefined;

// For getting cluster info. Copied from telemetry_collection/get_cluster_info.ts
export interface ESClusterInfo {
  cluster_uuid: string;
  cluster_name: string;
  version?: {
    number: string;
    build_flavor: string;
    build_type: string;
    build_hash: string;
    build_date: string;
    build_snapshot?: boolean;
    lucene_version: string;
    minimum_wire_compatibility_version: string;
    minimum_index_compatibility_version: string;
  };
}

// From https://www.elastic.co/guide/en/elasticsearch/reference/current/get-license.html
export interface ESLicense {
  status: string;
  uid: string;
  type: string;
  issue_date?: string;
  issue_date_in_millis?: number;
  expiry_date?: string;
  expirty_date_in_millis?: number;
  max_nodes?: number;
  issued_to?: string;
  issuer?: string;
  start_date_in_millis?: number;
}

export interface TelemetryEvent {
  [key: string]: SearchTypes;
  '@timestamp'?: string;
  data_stream?: {
    [key: string]: SearchTypes;
    dataset?: string;
  };
  cluster_name?: string;
  cluster_uuid?: string;
  package_version?: string;
  file?: {
    [key: string]: SearchTypes;
    Ext?: {
      [key: string]: SearchTypes;
    };
  };
  license?: ESLicense;
  event?: {
    id?: string;
    kind?: string;
  };
}

// EP Policy Response

export interface EndpointPolicyResponseAggregation {
  hits: {
    total: { value: number };
  };
  aggregations: {
    policy_responses: {
      buckets: Array<{
        key: string;
        doc_count: number;
        latest_response: EndpointPolicyResponseHits;
      }>;
    };
  };
}

interface EndpointPolicyResponseHits {
  hits: {
    total: { value: number };
    hits: EndpointPolicyResponseDocument[];
  };
}

interface NonPolicyConfiguration {
  isolation: boolean;
}

export interface EndpointPolicyResponseDocument {
  _source: {
    '@timestamp': string;
    agent: {
      id: string;
    };
    event: {
      agent_id_status: string;
    };
    Endpoint: {
      policy: {
        applied: {
          actions: Array<{
            name: string;
            message: string;
            status: string;
          }>;
          artifacts: {
            global: {
              version: string;
            };
          };
          status: string;
        };
      };
      configuration: NonPolicyConfiguration;
      state: NonPolicyConfiguration;
    };
  };
}

// EP Metrics

export interface EndpointMetricsAggregation {
  hits: {
    total: { value: number };
  };
  aggregations: {
    endpoint_agents: {
      buckets: Array<{ key: string; doc_count: number; latest_metrics: EndpointMetricHits }>;
    };
    endpoint_count: { value: number };
  };
}

interface EndpointMetricHits {
  hits: {
    total: { value: number };
    hits: EndpointMetricDocument[];
  };
}

interface EndpointMetricDocument {
  _source: {
    '@timestamp': string;
    agent: {
      id: string;
      version: string;
    };
    Endpoint: {
      metrics: EndpointMetrics;
    };
    elastic: {
      agent: {
        id: string;
      };
    };
    host: {
      os: EndpointMetricOS;
    };
    event: {
      agent_id_status: string;
    };
  };
}

interface DocumentsVolumeMetrics {
  suppressed_count: number;
  suppressed_bytes: number;
  sent_count: number;
  sent_bytes: number;
}

interface SystemImpactEventsMetrics {
  week_ms: number;
}

export interface EndpointMetrics {
  memory: {
    endpoint: {
      private: {
        mean: number;
        latest: number;
      };
    };
  };
  cpu: {
    endpoint: {
      histogram: {
        counts: number[];
        values: number[];
      };
      mean: number;
      latest: number;
    };
  };
  uptime: {
    endpoint: number;
    system: number;
  };
  documents_volume: {
    file_events: DocumentsVolumeMetrics;
    library_events: DocumentsVolumeMetrics;
    process_events: DocumentsVolumeMetrics;
    registry_events: DocumentsVolumeMetrics;
    network_events: DocumentsVolumeMetrics;
    overall: DocumentsVolumeMetrics;
    alerts: DocumentsVolumeMetrics;
    diagnostic_alerts: DocumentsVolumeMetrics;
    dns_events: DocumentsVolumeMetrics;
    security_events: DocumentsVolumeMetrics;
  };
  malicious_behavior_rules: Array<{ id: string; endpoint_uptime_percent: number }>;
  system_impact: Array<{
    process: {
      code_signature: Array<{
        trusted: boolean;
        subject_name: string;
        exists: boolean;
        status: string;
      }>;
      executable: string;
    };
    malware?: SystemImpactEventsMetrics;
    process_events?: SystemImpactEventsMetrics;
    registry_events?: SystemImpactEventsMetrics;
    dns_events?: SystemImpactEventsMetrics;
    network_events?: SystemImpactEventsMetrics;
    overall?: SystemImpactEventsMetrics;
    library_load_events?: SystemImpactEventsMetrics;
  }>;
  threads: Array<{ name: string; cpu: { mean: number } }>;
  event_filter: {
    active_global_count: number;
    active_user_count: number;
  };
}

interface EndpointMetricOS {
  Ext: {
    variant: string;
  };
  kernel: string;
  name: string;
  family: string;
  version: string;
  platform: string;
  full: string;
}

// EP Metadata

export interface EndpointMetadataAggregation {
  hits: {
    total: { value: number };
  };
  aggregations: {
    endpoint_metadata: {
      buckets: Array<{ key: string; doc_count: number; latest_metadata: EndpointMetadataHits }>;
    };
  };
}

interface EndpointMetadataHits {
  hits: {
    total: { value: number };
    hits: EndpointMetadataDocument[];
  };
}

export interface EndpointMetadataDocument {
  _source: {
    '@timestamp': string;
    agent: {
      id: string;
      version: string;
    };
    Endpoint: {
      capabilities: string[];
    };
    elastic: {
      agent: {
        id: string;
      };
    };
  };
}

export interface GetEndpointListResponse {
  per_page: number;
  page: number;
  total: number;
  data: ExceptionListItem[];
}

// Telemetry List types

export interface ExceptionListItem {
  id: string;
  rule_version?: number;
  name: string;
  created_at: string;
  updated_at: string;
  entries: object;
  os_types: object;
}

export interface ListTemplate {
  '@timestamp': string;
  cluster_uuid: string;
  cluster_name: string;
  license_id: string | undefined;
  detection_rule?: TelemetryEvent;
  endpoint_exception?: TelemetryEvent;
  endpoint_event_filter?: TelemetryEvent;
  trusted_application?: TelemetryEvent;
}

// Detection Rule types

interface ExceptionListEntry {
  id: string;
  list_id: string;
  type: string;
  namespace_type: string;
}

interface DetectionRuleParms {
  ruleId: string;
  version: number;
  type: string;
  exceptionsList: ExceptionListEntry[];
}

export interface RuleSearchResult {
  alert: {
    name: string;
    enabled: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    params: DetectionRuleParms;
  };
}

// EP Timeline telemetry

export type EnhancedAlertEvent = AlertEvent & { 'event.id': string; 'kibana.alert.uuid': string };

export type TimelineTelemetryEvent = ResolverNode & { event: SafeResolverEvent | undefined };

export interface TimelineTelemetryTemplate {
  '@timestamp': string;
  cluster_uuid: string;
  cluster_name: string;
  version: string | undefined;
  license_uuid: string | undefined;
  alert_id: string | undefined;
  event_id: string;
  timeline: TimelineTelemetryEvent[];
}

export interface ValueListMetaData {
  total_list_count: number;
  types: Array<{
    type: string;
    count: number;
  }>;
  lists: Array<{
    id: string;
    count: number;
  }>;
  included_in_exception_lists_count: number;
  used_in_indicator_match_rule_count: number;
}

export interface ValueListResponseAggregation {
  aggregations: {
    total_value_list_count: { value: number };
    type_breakdown: {
      buckets: Array<{
        key: string;
        doc_count: number;
      }>;
    };
  };
}

export interface ValueListItemsResponseAggregation {
  aggregations: {
    value_list_item_count: {
      buckets: Array<{
        key: string;
        doc_count: number;
      }>;
    };
  };
}

export interface ValueListExceptionListResponseAggregation {
  aggregations: {
    vl_included_in_exception_lists_count: { value: number };
  };
}

export interface ValueListIndicatorMatchResponseAggregation {
  aggregations: {
    vl_used_in_indicator_match_rule_count: { value: number };
  };
}

export interface TaskMetric {
  name: string;
  passed: boolean;
  time_executed_in_ms: number;
  start_time: number;
  end_time: number;
  error_message?: string;
}

export interface TelemetryConfiguration {
  telemetry_max_buffer_size: number;
  max_security_list_telemetry_batch: number;
  max_endpoint_telemetry_batch: number;
  max_detection_rule_telemetry_batch: number;
  max_detection_alerts_batch: number;
}

export interface TelemetryFilterListArtifact {
  endpoint_alerts: AllowlistFields;
  exception_lists: AllowlistFields;
  prebuilt_rules_alerts: AllowlistFields;
}

export interface ValueListResponse {
  listMetricsResponse: ValueListResponseAggregation;
  itemMetricsResponse: ValueListItemsResponseAggregation;
  exceptionListMetricsResponse: ValueListExceptionListResponseAggregation;
  indicatorMatchMetricsResponse: ValueListIndicatorMatchResponseAggregation;
}
