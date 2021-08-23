/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  deprecated?: number;
}

type BaseJobTypes = 'csv' | 'csv_searchsource' | 'PNG' | 'printable_pdf';

export interface LayoutCounts {
  print: number;
  preserve_layout: number;
}

type AppNames = 'canvas workpad' | 'dashboard' | 'visualization';
export type AppCounts = {
  [A in AppNames]?: number;
};

export type JobTypes = { [K in BaseJobTypes]: AvailableTotal } & {
  printable_pdf: AvailableTotal & {
    app: AppCounts;
    layout: LayoutCounts;
  };
};

export type ByAppCounts = { [J in BaseJobTypes]?: AppCounts };

type Statuses = 'completed' | 'completed_with_warnings' | 'failed' | 'pending' | 'processing';

type StatusCounts = {
  [S in Statuses]?: number;
};
type StatusByAppCounts = {
  [S in Statuses]?: ByAppCounts;
};

export type RangeStats = JobTypes & {
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

export type ExportType = 'csv' | 'csv_searchsource' | 'printable_pdf' | 'PNG';
export type FeatureAvailabilityMap = { [F in ExportType]: boolean };

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
