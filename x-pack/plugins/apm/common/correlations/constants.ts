/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fields to exclude as potential field candidates
 */
export const FIELDS_TO_EXCLUDE_AS_CANDIDATE = new Set([
  // Exclude for all usage Contexts
  'parent.id',
  'trace.id',
  'transaction.id',
  '@timestamp',
  'timestamp.us',
  'agent.ephemeral_id',
  'ecs.version',
  'event.ingested',
  'http.response.finished',
  'parent.id',
  'trace.id',
  'transaction.duration.us',
  'transaction.id',
  'process.pid',
  'process.ppid',
  'processor.event',
  'processor.name',
  'transaction.sampled',
  'transaction.span_count.dropped',
  // Exclude for correlation on a Single Service
  'agent.name',
  'http.request.method',
  'service.framework.name',
  'service.language.name',
  'service.name',
  'service.runtime.name',
  'transaction.name',
  'transaction.type',
]);

export const FIELD_PREFIX_TO_EXCLUDE_AS_CANDIDATE = ['observer.'];

/**
 * Fields to include/prioritize as potential field candidates
 */
export const FIELDS_TO_ADD_AS_CANDIDATE = new Set([
  'service.version',
  'service.node.name',
  'service.framework.version',
  'service.language.version',
  'service.runtime.version',
  'kubernetes.pod.name',
  'kubernetes.pod.uid',
  'container.id',
  'source.ip',
  'client.ip',
  'host.ip',
  'service.environment',
  'process.args',
  'http.response.status_code',
]);
export const FIELD_PREFIX_TO_ADD_AS_CANDIDATE = [
  'cloud.',
  'labels.',
  'user_agent.',
];

/**
 * Other constants
 */
export const POPULATED_DOC_COUNT_SAMPLE_SIZE = 1000;

export const PERCENTILES_STEP = 2;
export const TERMS_SIZE = 20;
export const SIGNIFICANT_FRACTION = 3;
export const SIGNIFICANT_VALUE_DIGITS = 3;

export const CORRELATION_THRESHOLD = 0.3;
export const KS_TEST_THRESHOLD = 0.1;

export const ERROR_CORRELATION_THRESHOLD = 0.02;

export const DEFAULT_PERCENTILE_THRESHOLD = 95;
export const DEBOUNCE_INTERVAL = 100;
