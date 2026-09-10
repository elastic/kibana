/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { getApmDataViewIndexPattern } from './get_apm_data_view_index_pattern';

describe('getApmDataViewIndexPattern', () => {
  it('combines, sorts and removes duplicates', () => {
    const title = getApmDataViewIndexPattern({
      error:
        'remote_cluster:apm-*,remote_cluster:logs-apm*,remote_cluster:logs-*.otel-*,apm-*,logs-apm*,logs-*.otel-*',
      onboarding: 'remote_cluster:apm-*,apm-*',
      span: 'remote_cluster:apm-*,remote_cluster:traces-apm*,remote_cluster:traces-*.otel-*,apm-*,traces-apm*,traces-*.otel-*',
      transaction:
        'remote_cluster:apm-*,remote_cluster:traces-apm*,remote_cluster:traces-*.otel-*,apm-*,traces-apm*,traces-*.otel-*',
      metric:
        'remote_cluster:apm-*,remote_cluster:metrics-apm*,remote_cluster:metrics-*.otel-*,apm-*,metrics-apm*,metrics-*.otel-*',
      sourcemap: 'remote_cluster:apm-*,apm-*',
    } as APMIndices);

    expect(title).toBe(
      'apm-*,logs-*.otel-*,logs-apm*,metrics-*.otel-*,metrics-apm*,remote_cluster:apm-*,remote_cluster:logs-*.otel-*,remote_cluster:logs-apm*,remote_cluster:metrics-*.otel-*,remote_cluster:metrics-apm*,remote_cluster:traces-*.otel-*,remote_cluster:traces-apm*,traces-*.otel-*,traces-apm*'
    );
  });

  it('handles falsy values', () => {
    const title = getApmDataViewIndexPattern({
      error: null,
      onboarding: undefined,
      span: '',
      transaction:
        'remote_cluster:apm-*,remote_cluster:traces-apm*,remote_cluster:traces-*.otel-*,apm-*,traces-apm*,traces-*.otel-*',
      metric:
        'remote_cluster:apm-*,remote_cluster:metrics-apm*,remote_cluster:metrics-*.otel-*,apm-*,metrics-apm*,metrics-*.otel-*',
      sourcemap: 'remote_cluster:apm-*,apm-*',
    } as unknown as APMIndices);

    expect(title).toBe(
      'apm-*,metrics-*.otel-*,metrics-apm*,remote_cluster:apm-*,remote_cluster:metrics-*.otel-*,remote_cluster:metrics-apm*,remote_cluster:traces-*.otel-*,remote_cluster:traces-apm*,traces-*.otel-*,traces-apm*'
    );
  });
});
