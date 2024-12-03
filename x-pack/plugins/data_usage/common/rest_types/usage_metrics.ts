/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

// note these should be sorted alphabetically as we sort the URL params on the browser side
// before making the request, else the cache key will be different and that would invoke a new request
export const DEFAULT_METRIC_TYPES = ['ingest_rate', 'storage_retained'] as const;
export const METRIC_TYPE_VALUES = [
  ...DEFAULT_METRIC_TYPES,
  'search_vcu',
  'ingest_vcu',
  'ml_vcu',
  'index_latency',
  'index_rate',
  'search_latency',
  'search_rate',
] as const;

export type MetricTypes = (typeof METRIC_TYPE_VALUES)[number];

export const isDefaultMetricType = (metricType: string) =>
  // @ts-ignore
  DEFAULT_METRIC_TYPES.includes(metricType);

export const METRIC_TYPE_API_VALUES_TO_UI_OPTIONS_MAP = Object.freeze<Record<MetricTypes, string>>({
  storage_retained: 'Data Retained in Storage',
  ingest_rate: 'Data Ingested',
  search_vcu: 'Search VCU',
  ingest_vcu: 'Ingest VCU',
  ml_vcu: 'ML VCU',
  index_latency: 'Index Latency',
  index_rate: 'Index Rate',
  search_latency: 'Search Latency',
  search_rate: 'Search Rate',
});

export const METRIC_TYPE_UI_OPTIONS_VALUES_TO_API_MAP = Object.freeze<Record<string, MetricTypes>>({
  'Data Retained in Storage': 'storage_retained',
  'Data Ingested': 'ingest_rate',
  'Search VCU': 'search_vcu',
  'Ingest VCU': 'ingest_vcu',
  'ML VCU': 'ml_vcu',
  'Index Latency': 'index_latency',
  'Index Rate': 'index_rate',
  'Search Latency': 'search_latency',
  'Search Rate': 'search_rate',
});

// type guard for MetricTypes
export const isMetricType = (type: string): type is MetricTypes =>
  METRIC_TYPE_VALUES.includes(type as MetricTypes);

// @ts-ignore
const isValidMetricType = (value: string) => METRIC_TYPE_VALUES.includes(value);

const DateSchema = schema.string({
  minLength: 1,
  validate: (v) => (v.trim().length ? undefined : 'Date ISO string must not be empty'),
});

const metricTypesSchema = schema.oneOf(
  // @ts-expect-error TS2769: No overload matches this call
  METRIC_TYPE_VALUES.map((metricType) => schema.literal(metricType)) // Create a oneOf schema for the keys
);
export const UsageMetricsRequestSchema = schema.object({
  from: DateSchema,
  to: DateSchema,
  metricTypes: schema.arrayOf(schema.string(), {
    minSize: 1,
    validate: (values) => {
      const trimmedValues = values.map((v) => v.trim());
      if (trimmedValues.some((v) => !v.length)) {
        return '[metricTypes] list cannot contain empty values';
      } else if (trimmedValues.some((v) => !isValidMetricType(v))) {
        return `must be one of ${METRIC_TYPE_VALUES.join(', ')}`;
      }
    },
  }),
  dataStreams: schema.arrayOf(schema.string(), {
    validate: (values) => {
      if (values.map((v) => v.trim()).some((v) => !v.length)) {
        return 'list cannot contain empty values';
      }
    },
  }),
});

export type UsageMetricsRequestBody = TypeOf<typeof UsageMetricsRequestSchema>;

export const UsageMetricsResponseSchema = {
  body: () =>
    schema.recordOf(
      metricTypesSchema,
      schema.arrayOf(
        schema.object({
          name: schema.string(),
          error: schema.nullable(schema.string()),
          data: schema.arrayOf(
            schema.object({
              x: schema.number(),
              y: schema.number(),
            })
          ),
        })
      )
    ),
};

export type UsageMetricsResponseSchemaBody = Partial<Record<MetricTypes, MetricSeries[]>>;

export type MetricSeries = TypeOf<typeof UsageMetricsResponseSchema.body>[MetricTypes][number];

export const UsageMetricsAutoOpsResponseSchema = {
  body: () =>
    schema.recordOf(
      metricTypesSchema,
      schema.arrayOf(
        schema.object({
          name: schema.string(),
          error: schema.nullable(schema.string()),
          data: schema.arrayOf(schema.arrayOf(schema.number(), { minSize: 2, maxSize: 2 })),
        })
      )
    ),
};

export type UsageMetricsAutoOpsResponseMetricSeries = TypeOf<
  typeof UsageMetricsAutoOpsResponseSchema.body
>[MetricTypes][number];

export type UsageMetricsAutoOpsResponseSchemaBody = Partial<
  Record<MetricTypes, UsageMetricsAutoOpsResponseMetricSeries[]>
>;
