/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppName, JobType, JOB_STATUSES } from '../../common/types';

export interface KeyCountBucket {
  key: string;
  doc_count: number;
  isDeprecated?: {
    doc_count: number;
  };
}

export interface AggregationBuckets {
  buckets: KeyCountBucket[];
}

export interface StatusByAppBucket {
  key: string;
  doc_count: number;
  jobTypes: {
    buckets: Array<{
      doc_count: number;
      key: string;
      appNames: AggregationBuckets;
    }>;
  };
}

export interface AggregationResultBuckets {
  jobTypes: AggregationBuckets;
  layoutTypes: {
    doc_count: number;
    pdf: AggregationBuckets;
  };
  objectTypes: {
    doc_count: number;
    pdf: AggregationBuckets;
  };
  statusTypes: AggregationBuckets;
  statusByApp: {
    buckets: StatusByAppBucket[];
  };
  doc_count: number;
}

export interface SearchResponse {
  aggregations: {
    ranges: {
      buckets: {
        all: AggregationResultBuckets;
        last7Days: AggregationResultBuckets;
      };
    };
  };
}

export interface AvailableTotal {
  available: boolean;
  total: number;
  deprecated: number;
  app?: AppCount;
  layout?: LayoutCount;
}

export interface LayoutCount {
  print: number;
  preserve_layout: number;
  canvas: number;
}

export type AppCount = {
  [A in AppName]?: number;
};

export type AvailableTotals = { [K in JobType]: AvailableTotal } & {
  printable_pdf: Required<AvailableTotal>;
};

export type AppCounts = { [J in JobType]: AppCount };

export type StatusCounts = {
  [S in JOB_STATUSES]?: number;
};
export type StatusByAppCounts = {
  [S in JOB_STATUSES]?: AppCounts;
};

export type RangeStats = AvailableTotals & {
  _all: number;
  status: StatusCounts;
  statuses: StatusByAppCounts;
};

export type ReportingUsageType = RangeStats & {
  available: boolean;
  browser_type: string;
  enabled: boolean;
  last7Days: RangeStats;
};

export type FeatureAvailabilityMap = { [F in JobType]: boolean };

export interface ReportingUsageSearchResponse {
  aggregations: {
    ranges: {
      buckets: {
        all: AggregationResultBuckets;
        last7Days: AggregationResultBuckets;
      };
    };
  };
}
