/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

const METRIC_TYPE_VALUES = [
  'storage_retained',
  'ingest_rate',
  'search_vcu',
  'ingest_vcu',
  'ml_vcu',
  'index_latency',
  'index_rate',
  'search_latency',
  'search_rate',
] as const;

export type MetricTypes = (typeof METRIC_TYPE_VALUES)[number];

// type guard for MetricTypes
export const isMetricType = (type: string): type is MetricTypes =>
  METRIC_TYPE_VALUES.includes(type as MetricTypes);

// @ts-ignore
const isValidMetricType = (value: string) => METRIC_TYPE_VALUES.includes(value);

const DateSchema = schema.maybe(schema.string());

const metricTypesSchema = {
  // @ts-expect-error TS2769: No overload matches this call
  schema: schema.oneOf(METRIC_TYPE_VALUES.map((metricType) => schema.literal(metricType))),
  options: { minSize: 1, maxSize: METRIC_TYPE_VALUES.length },
};

export const UsageMetricsRequestSchema = {
  query: schema.object({
    from: DateSchema,
    to: DateSchema,
    size: schema.maybe(schema.number()), // should be same as dataStreams.length
    metricTypes: schema.oneOf([
      schema.arrayOf(schema.string(), {
        ...metricTypesSchema.options,
        validate: (values) => {
          if (values.map((v) => v.trim()).some((v) => !v.length)) {
            return '[metricTypes] list can not contain empty values';
          } else if (values.map((v) => v.trim()).some((v) => !isValidMetricType(v))) {
            return `[metricTypes] must be one of ${METRIC_TYPE_VALUES.join(', ')}`;
          }
        },
      }),
      schema.string({
        validate: (v) => {
          if (!v.trim().length) {
            return '[metricTypes] must have at least one value';
          } else if (!isValidMetricType(v)) {
            return `[metricTypes] must be one of ${METRIC_TYPE_VALUES.join(', ')}`;
          }
        },
      }),
    ]),
    dataStreams: schema.maybe(
      schema.oneOf([
        schema.arrayOf(schema.string(), {
          minSize: 1,
          validate: (values) => {
            if (values.map((v) => v.trim()).some((v) => !v.length)) {
              return '[dataStreams] list can not contain empty values';
            }
          },
        }),
        schema.string({
          validate: (v) =>
            v.trim().length ? undefined : '[dataStreams] must have at least one value',
        }),
      ])
    ),
  }),
};

export type UsageMetricsRequestSchemaQueryParams = TypeOf<typeof UsageMetricsRequestSchema.query>;

export const UsageMetricsResponseSchema = {
  body: () =>
    schema.object({
      charts: schema.arrayOf(
        schema.object({
          key: metricTypesSchema.schema,
          series: schema.arrayOf(
            schema.object({
              streamName: schema.string(),
              data: schema.arrayOf(
                schema.object({
                  x: schema.number(),
                  y: schema.number(),
                })
              ),
            })
          ),
        }),
        { maxSize: 2 }
      ),
    }),
};

export type UsageMetricsResponseSchemaBody = TypeOf<typeof UsageMetricsResponseSchema.body>;
