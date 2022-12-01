#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const EventLogTelemetryFileTemplate = `

import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type {
  AggregationsPercentilesAggregateBase,
  AggregationsSingleMetricAggregateBase,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { byTypeSchema } from '../by_type_schema';

export interface EventUsageSchema %%SCHEMA%%
export interface EventUsageByTypeSchema %%SCHEMA_BY_TYPE%%

export type EventSchema = EventUsageSchema & EventUsageByTypeSchema;

export type AvgSchema = number;
export type AvgByTypeSchema = Record<string, number>;
export interface PercentileSchema {
  p50: number;
  p90: number;
  p99: number;
}
export interface PercentileByTypeSchema {
  p50: Record<string, number>;
  p90: Record<string, number>;
  p99: Record<string, number>;
}

export const EmptyEventUsage = %%DEFAULT_VALS%%;

const byPercentileSchema: MakeSchemaFrom<PercentileSchema> = {
  p50: { type: 'long' },
  p90: { type: 'long' },
  p99: { type: 'long' },
};

const byPercentileSchemaByType: MakeSchemaFrom<PercentileByTypeSchema> = {
  p50: byTypeSchema,
  p90: byTypeSchema,
  p99: byTypeSchema,
};

export const EventUsageMapping = %%MAPPINGS%%;

export const EventUsageAggregations = %%AGGREGATIONS%%;

export interface EventUsageAggregationType %%AGG_TYPE%%
`.trim();

module.exports = {
  EventLogTelemetryFileTemplate,
};
