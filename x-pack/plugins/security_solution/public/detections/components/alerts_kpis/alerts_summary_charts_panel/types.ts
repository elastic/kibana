/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Filter, Query } from '@kbn/es-query';
import type { EntityFilter } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';

export interface UseAlertsQueryProps {
  uniqueQueryId: string;
  signalIndexName: string | null;
  skip?: boolean;
  entityFilter?: EntityFilter;
  query?: Query;
  filters?: Filter[];
  runtimeMappings?: MappingRuntimeFields;
}

export interface AlertsResponse<Hit = {}, Aggregations = {} | undefined> {
  took: number;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  aggregations?: Aggregations;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: Hit[];
  };
}

export interface SeverityData {
  key: Severity;
  value: number;
  label: string;
}

export interface AlertsBySeverityAgg {
  statusBySeverity: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: SeverityBucket[];
  };
}
interface SeverityBucket {
  key: Severity;
  doc_count: number;
}

export interface AlertsByHostAgg {
  alertsByHost: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: HostBucket[];
  };
}

export interface HostBucket {
  key: string;
  doc_count: number;
}

export interface HostData {
  key: string;
  value: number;
  label: string;
}

export interface AlertsByRuleAgg {
  alertsByRule: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: RuleBucket[];
  };
}

interface RuleBucket {
  key: string;
  doc_count: number;
  ruleByEventType?: RuleByEventType;
}

interface RuleByEventType {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: EventBucket[];
}

interface EventBucket {
  key: string;
  doc_count: number;
}

export interface DetectionsData {
  rule: string;
  preventions: number;
  detections: number;
}
