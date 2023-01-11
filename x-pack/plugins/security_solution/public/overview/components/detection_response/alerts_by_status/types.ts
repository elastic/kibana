/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import type { ESQuery } from '../../../../../common/typed_json';

interface StatusBySeverity {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: SeverityBucket[];
}

interface StatusBucket {
  key: AlertsByStatus;
  doc_count: number;
  statusBySeverity?: StatusBySeverity;
}

interface SeverityBucket {
  key: Severity;
  doc_count: number;
}

export interface AlertsByStatusAgg {
  alertsByStatus: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: StatusBucket[];
  };
}

export interface AlertsByStatusResponse<Hit = {}, Aggregations = {} | undefined> {
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

export interface VisualizationAlertsByStatusResponse<Hit = {}, Aggregations = {} | undefined> {
  took: number;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  aggregations?: Aggregations;
  hits: {
    total: number;
    hits: Hit[];
  };
}

export interface SeverityBuckets {
  key: Severity;
  value: number;
  label?: string;
}
export type ParsedAlertsData = Partial<
  Record<AlertsByStatus, { total: number; severities: SeverityBuckets[] }>
> | null;

export type AlertsByStatus = 'open' | 'acknowledged' | 'closed';

export interface AlertDonutEmbeddableProps {
  status: AlertsByStatus;
  timerange: { from: string; to: string };
  label: string;
}

export interface VisualizationAlertsByStatusData {
  responses: VisualizationAlertsByStatusResponse[];
  requests: ESQuery[];
  isLoading: boolean;
}
export interface VisualizationInspectQuery {
  dsl: ESQuery[];
  response: VisualizationAlertsByStatusResponse[];
}

export const DETECTION_RESPONSE_ALERTS_BY_STATUS_ID = 'detection-response-alerts-by-status';
