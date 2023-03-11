/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { TimeSeriesQuery } from './time_series_query';
export { TIME_SERIES_BUCKET_SELECTOR_FIELD } from './time_series_query';
export type { CoreQueryParams } from './core_query_types';
export {
  CoreQueryParamsSchemaProperties,
  validateCoreQueryBody,
  validateTimeWindowUnits,
  validateAggType,
  validateGroupBy,
} from './core_query_types';
