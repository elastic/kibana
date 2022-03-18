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

interface SizeBuckets {
  sizes?: { values: SizePercentiles };
}

interface ObjectTypeBuckets {
  objectTypes: AggregationBuckets;
}

interface LayoutTypeBuckets {
  layoutTypes: AggregationBuckets;
}

/*
 * NOTE: This list needs to be explicit in order for the telemetry schema check script to resolve the types.
 * However, using `keyof JobTypes` is functionally the same thing
 */
type BaseJobTypes =
  | 'csv_searchsource'
  | 'csv_searchsource_immediate'
  | 'PNG'
  | 'PNGV2'
  | 'printable_pdf'
  | 'printable_pdf_v2';

export interface KeyCountBucket
  extends DocCount,
    SizeBuckets,
    ObjectTypeBuckets,
    LayoutTypeBuckets {
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

export interface AggregationResultBuckets extends DocCount, SizeBuckets {
  jobTypes?: AggregationBuckets;
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
  sizes: SizePercentiles;
  app: {
    search?: number;
    dashboard?: number;
    visualization?: number;
    'canvas workpad'?: number;
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

export interface JobTypes {
  csv_searchsource: AvailableTotal & { metrics: MetricsStatsCsv };
  csv_searchsource_immediate: AvailableTotal & { metrics: MetricsStatsCsv };
  PNG: AvailableTotal & { metrics: MetricsStatsPng };
  PNGV2: AvailableTotal & { metrics: MetricsStatsPng };
  printable_pdf: AvailableTotal & { layout: LayoutCounts; metrics: MetricsStatsPdf };
  printable_pdf_v2: AvailableTotal & { layout: LayoutCounts; metrics: MetricsStatsPdf };
}

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

interface MetricsStatsCsv {
  csv_rows: MetricsPercentiles;
}

interface MetricsStatsPng {
  png_cpu: MetricsPercentiles;
  png_memory: MetricsPercentiles;
}

interface MetricsStatsPdf {
  pdf_cpu: MetricsPercentiles;
  pdf_memory: MetricsPercentiles;
  pdf_pages: MetricsPercentiles;
}

export interface MetricsPercentiles {
  '50.0': number | null;
  '75.0': number | null;
  '95.0': number | null;
  '99.0': number | null;
}

export interface MetricsStats {
  csv_rows: MetricsPercentiles;
  pdf_cpu: MetricsPercentiles;
  pdf_memory: MetricsPercentiles;
  pdf_pages: MetricsPercentiles;
  png_cpu: MetricsPercentiles;
  png_memory: MetricsPercentiles;
}

export type ReportingUsageType = RangeStats & {
  available: boolean;
  enabled: boolean;
  last7Days: RangeStats;
};

export type FeatureAvailabilityMap = Record<string, boolean>;
