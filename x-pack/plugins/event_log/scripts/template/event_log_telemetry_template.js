#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const EventLogTelemetryFileTemplate = `

import { cloneDeep } from 'lodash';
import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type {
  AggregationsPercentilesAggregateBase,
  AggregationsSingleMetricAggregateBase,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { byTypeSchema } from '../by_type_schema';

export interface EventLogUsageSchema %%SCHEMA%%
export interface EventLogUsageByTypeSchema %%SCHEMA_BY_TYPE%%

export type EventLogUsage = EventLogUsageSchema & EventLogUsageByTypeSchema;

export type AvgValueSchema = number;
export type AvgValueByTypeSchema = Record<string, number>;
export interface PercentileValueSchema {
  p50: number;
  p90: number;
  p99: number;
}
export interface PercentileValueByTypeSchema {
  p50: Record<string, number>;
  p90: Record<string, number>;
  p99: Record<string, number>;
}

export const EmptyEventLogUsage = %%DEFAULT_VALS%%;

export const getEmptyEventLogUsage = () => cloneDeep(EmptyEventLogUsage);

export const EmptyEventLogUsageByType = %%DEFAULT_VALS_BY_TYPE%%;

export const getEmptyEventLogUsageByType = () => cloneDeep(EmptyEventLogUsageByType);

const byPercentileSchema: MakeSchemaFrom<PercentileValueSchema> = {
  p50: { type: 'long' },
  p90: { type: 'long' },
  p99: { type: 'long' },
};

const byPercentileSchemaByType: MakeSchemaFrom<PercentileValueByTypeSchema> = {
  p50: byTypeSchema,
  p90: byTypeSchema,
  p99: byTypeSchema,
};

export const EventLogUsageMapping: MakeSchemaFrom<EventLogUsage> = %%MAPPINGS%%;

export const EventLogUsageAggregations = %%AGGREGATIONS%%;

export interface EventLogUsageAggregationType %%AGG_TYPE%%
`.trim();

module.exports = {
  EventLogTelemetryFileTemplate,
};
