/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Filter, Query } from '@kbn/es-query';
import type { EntityFilter } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import type {
  SeverityBucket,
  SeverityBuckets as SeverityData,
} from '../../../../overview/components/detection_response/alerts_by_status/types';
import type { BucketItem } from '../../../../../common/search_strategy/security_solution/cti';

export type AggregationType = 'Severity' | 'Type' | 'Top';
export type AlertType = 'Detection' | 'Prevention';

export interface ChartsPanelProps {
  filters?: Filter[];
  query?: Query;
  signalIndexName: string | null;
  runtimeMappings?: MappingRuntimeFields;
  skip?: boolean;
  addFilter?: ({ field, value }: { field: string; value: string | number }) => void;
}
export interface UseAlertsQueryProps {
  aggregations: {};
  aggregationType: AggregationType;
  uniqueQueryId: string;
  signalIndexName: string | null;
  skip?: boolean;
  entityFilter?: EntityFilter;
  query?: Query;
  filters?: Filter[];
  runtimeMappings?: MappingRuntimeFields;
}

export interface AlertsBySeverityAgg {
  statusBySeverity: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: SeverityBucket[];
  };
}
export interface AlertsByTypeAgg {
  alertsByRule: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: RuleBucket[];
  };
}

export interface RuleBucket {
  key: string;
  doc_count: number;
  ruleByEventType?: RuleByEventType;
}

interface RuleByEventType {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: BucketItem[];
}

export interface AlertsTypeData {
  rule: string;
  type: AlertType;
  value: number;
  color: string;
}

export interface AlertsByGroupingAgg {
  alertsByGrouping: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: BucketItem[];
  };
}
export interface AlertsProgressBarData {
  key: string;
  value: number;
  percentage: number;
  label: string;
}

export type SummaryChartsAgg = Partial<AlertsBySeverityAgg | AlertsByTypeAgg | AlertsByGroupingAgg>;
export type SummaryChartsData = Partial<SeverityData | AlertsTypeData | AlertsProgressBarData>;
