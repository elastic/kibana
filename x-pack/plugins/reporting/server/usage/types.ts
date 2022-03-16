/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SizePercentiles {
  '1.0': number | null;
  '5.0': number | null;
  '25.0': number | null;
  '50.0': number | null;
  '75.0': number | null;
  '95.0': number | null;
  '99.0': number | null;
}

interface DocCount {
  doc_count: number;
}

interface SizeStats {
  sizes?: { values: SizePercentiles };
}

// FIXME: find a way to get this from exportTypesHandler or common/constants
export type BaseJobTypes =
  | 'csv_searchsource'
  | 'csv_searchsource_immediate'
  | 'PNG'
  | 'PNGV2'
  | 'printable_pdf'
  | 'printable_pdf_v2';

export interface KeyCountBucket extends DocCount, SizeStats {
  key: BaseJobTypes;
  isDeprecated?: DocCount;
}

export interface AggregationBuckets {
  buckets: KeyCountBucket[];
}

export interface StatusByAppBucket extends DocCount {
  key: string;
  jobTypes: {
    buckets: Array<
      {
        key: string;
        appNames: AggregationBuckets;
      } & DocCount
    >;
  };
}

export interface AggregationResultBuckets extends DocCount, SizeStats {
  jobTypes?: AggregationBuckets;
  layoutTypes: {
    pdf?: AggregationBuckets;
  } & DocCount;
  objectTypes: {
    pdf?: AggregationBuckets;
  } & DocCount;
  statusTypes: AggregationBuckets;
  statusByApp: {
    buckets: StatusByAppBucket[];
  };
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
  sizes?: SizePercentiles;
  app?: {
    search?: number;
    dashboard?: number;
    visualization?: number;
    'canvas workpad'?: number;
  };
  layout?: {
    print?: number;
    preserve_layout?: number;
    canvas?: number;
  };
}

export interface LayoutCounts {
  canvas: number;
  print: number;
  preserve_layout: number;
}

export type AppCounts = {
  [A in 'canvas workpad' | 'dashboard' | 'visualization' | 'search']?: number;
};

export type JobTypes = { [K in BaseJobTypes]: AvailableTotal };

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
  statuses?: StatusByAppCounts;
  output_size?: SizePercentiles;
};

export type ReportingUsageType = RangeStats & {
  available: boolean;
  enabled: boolean;
  last7Days: RangeStats;
};

export type FeatureAvailabilityMap = Record<string, boolean>;
