/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { BucketItem } from '../../../../../../common/search_strategy/security_solution/cti';
import type { SeverityBucket } from '../../../../../overview/components/detection_response/alerts_by_status/types';

export interface ChartCollapseAgg {
  statusBySeverity: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: SeverityBucket[];
  };
  topRule: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: BucketItem[];
  };
  topGrouping: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: BucketItem[];
  };
}
export interface ChartCollapseData {
  key: string;
  value: number;
  percentage: number;
  label: string;
}
