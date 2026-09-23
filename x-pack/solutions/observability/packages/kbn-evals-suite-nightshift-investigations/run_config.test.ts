/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runConfig } from './run_config';

const resolve = (options = {}, env = {}) => runConfig.resolve({ options, env });

it('selects stored investigations and sizes the server without passing the dataset ID to Scout', () => {
  expect(resolve({ 'dataset-id': 'stored-dataset', concurrency: '16' })).toEqual({
    playwright: {
      NIGHTSHIFT_DATASETS: 'trace-only',
      NIGHTSHIFT_DATASET_ID: 'stored-dataset',
      NIGHTSHIFT_CONCURRENCY: '16',
    },
    server: { NIGHTSHIFT_DATASETS: 'trace-only', NIGHTSHIFT_CONCURRENCY: '16' },
  });
});

it('keeps smoke as the default', () => {
  expect(resolve()).toEqual({
    playwright: { NIGHTSHIFT_DATASETS: 'synthetic-smoke' },
    server: { NIGHTSHIFT_DATASETS: 'synthetic-smoke' },
  });
});

it('selects trace-only with concurrency alone and defaults trace-only concurrency to two', () => {
  expect(resolve({ concurrency: '16' }).server.NIGHTSHIFT_DATASETS).toBe('trace-only');
  expect(resolve({}, { NIGHTSHIFT_DATASETS: 'trace-only' }).server.NIGHTSHIFT_CONCURRENCY).toBe(
    '2'
  );
});

it('uses environment defaults and lets CLI flags override them', () => {
  const env = { NIGHTSHIFT_DATASET_ID: 'from-env', NIGHTSHIFT_CONCURRENCY: '3' };
  expect(resolve({}, env).playwright).toMatchObject({
    NIGHTSHIFT_DATASET_ID: 'from-env',
    NIGHTSHIFT_CONCURRENCY: '3',
  });
  expect(resolve({ 'dataset-id': 'from-cli', concurrency: '16' }, env).playwright).toMatchObject({
    NIGHTSHIFT_DATASET_ID: 'from-cli',
    NIGHTSHIFT_CONCURRENCY: '16',
  });
});

it.each(['0', '46', '1.5', 'invalid', ''])('rejects invalid concurrency %s', (concurrency) => {
  expect(() => resolve({ concurrency })).toThrow('integer between 1 and 45');
});

it('rejects invalid environment settings before starting services', () => {
  expect(() => resolve({}, { NIGHTSHIFT_DATASETS: 'unknown' })).toThrow('NIGHTSHIFT_DATASETS');
  expect(() =>
    resolve({}, { NIGHTSHIFT_DATASETS: 'trace-only', NIGHTSHIFT_CONCURRENCY: '46' })
  ).toThrow('integer between 1 and 45');
});

it('rejects ambiguous dataset sources from either CLI or environment', () => {
  expect(() =>
    resolve({ 'dataset-id': 'stored' }, { NIGHTSHIFT_EXAMPLES_FILE: 'examples.json' })
  ).toThrow('Choose either');
  expect(() =>
    resolve({}, { NIGHTSHIFT_DATASET_ID: 'stored', NIGHTSHIFT_EXAMPLES_FILE: 'examples.json' })
  ).toThrow('Choose either');
});

it('keeps server settings stable across dataset changes', () => {
  expect(resolve({ 'dataset-id': 'first' }).server).toEqual(
    resolve({ 'dataset-id': 'second' }).server
  );
});
