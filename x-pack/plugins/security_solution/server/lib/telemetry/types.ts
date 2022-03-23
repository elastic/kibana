/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

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

// List HTTP Types

export const GetTrustedAppsRequestSchema = {
  query: schema.object({
    page: schema.maybe(schema.number({ defaultValue: 1, min: 1 })),
    per_page: schema.maybe(schema.number({ defaultValue: 20, min: 1 })),
    kuery: schema.maybe(schema.string()),
  }),
};

export type GetEndpointListRequest = TypeOf<typeof GetTrustedAppsRequestSchema.query>;

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
