/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum JOB_TYPE {
  SINGLE_METRIC = 'single_metric',
  MULTI_METRIC = 'multi_metric',
  POPULATION = 'population',
  ADVANCED = 'advanced',
  CATEGORIZATION = 'categorization',
}

export enum CREATED_BY_LABEL {
  SINGLE_METRIC = 'single-metric-wizard',
  MULTI_METRIC = 'multi-metric-wizard',
  POPULATION = 'population-wizard',
  CATEGORIZATION = 'categorization-wizard',
  APM_TRANSACTION = 'ml-module-apm-transaction',
}

export const DEFAULT_MODEL_MEMORY_LIMIT = '10MB';
export const DEFAULT_BUCKET_SPAN = '15m';
export const DEFAULT_RARE_BUCKET_SPAN = '1h';
export const DEFAULT_QUERY_DELAY = '60s';

export const SHARED_RESULTS_INDEX_NAME = 'shared';
