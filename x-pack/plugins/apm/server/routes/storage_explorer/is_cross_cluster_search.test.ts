/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isCrossClusterSearch } from './is_cross_cluster_search';
import { ApmIndicesConfig } from '@kbn/observability-plugin/common/typings';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

describe('isCrossClusterSearch', () => {
  it('returns false when there are no remote clusters in APM indices', () => {
    const mockApmEventClient = {
      indices: {
        transaction: 'traces-apm*',
        span: 'traces-apm*',
        metric: 'metrics-apm*',
        error: 'logs-apm*',
      } as ApmIndicesConfig,
    } as unknown as APMEventClient;

    expect(isCrossClusterSearch(mockApmEventClient)).toBe(false);
  });

  it('returns false when there are multiple indices per type and no remote clusters in APM indices', () => {
    const mockApmEventClient = {
      indices: {
        transaction: 'traces-apm*,test-apm*',
        span: 'traces-apm*,test-apm*',
        metric: 'metrics-apm*,test-apm*',
        error: 'logs-apm*,test-apm*',
      } as ApmIndicesConfig,
    } as unknown as APMEventClient;

    expect(isCrossClusterSearch(mockApmEventClient)).toBe(false);
  });

  it('returns false when there are remote clusters in onboarding and sourcemap indices', () => {
    const mockApmEventClient = {
      indices: {
        transaction: '',
        span: '',
        metric: '',
        error: '',
        onboarding: 'apm-*,remote_cluster:apm-*',
      } as ApmIndicesConfig,
    } as unknown as APMEventClient;

    expect(isCrossClusterSearch(mockApmEventClient)).toBe(false);
  });

  it('returns true when there are remote clusters in transaction indices', () => {
    const mockApmEventClient = {
      indices: {
        transaction: 'traces-apm*,remote_cluster:traces-apm*',
        span: '',
        metric: '',
        error: '',
      } as ApmIndicesConfig,
    } as unknown as APMEventClient;

    expect(isCrossClusterSearch(mockApmEventClient)).toBe(true);
  });

  it('returns true when there are remote clusters in span indices', () => {
    const mockApmEventClient = {
      indices: {
        transaction: '',
        span: 'traces-apm*,remote_cluster:traces-apm*',
        metric: '',
        error: '',
      } as ApmIndicesConfig,
    } as unknown as APMEventClient;

    expect(isCrossClusterSearch(mockApmEventClient)).toBe(true);
  });

  it('returns true when there are remote clusters in metrics indices', () => {
    const mockApmEventClient = {
      indices: {
        transaction: '',
        span: '',
        metric: 'metrics-apm*,remote_cluster:metrics-apm*',
        error: '',
      } as ApmIndicesConfig,
    } as unknown as APMEventClient;

    expect(isCrossClusterSearch(mockApmEventClient)).toBe(true);
  });

  it('returns true when there are remote clusters in error indices', () => {
    const mockApmEventClient = {
      indices: {
        transaction: '',
        span: '',
        metric: '',
        error: 'logs-apm*,remote_cluster:logs-apm*',
      } as ApmIndicesConfig,
    } as unknown as APMEventClient;

    expect(isCrossClusterSearch(mockApmEventClient)).toBe(true);
  });
});
