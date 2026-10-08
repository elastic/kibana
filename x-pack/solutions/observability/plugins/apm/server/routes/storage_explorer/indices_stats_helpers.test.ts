/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { ApmPluginRequestHandlerContext } from '../typings';
import {
  getIndicesInfo,
  getIndicesLifecycleStatus,
  getTotalIndicesStats,
} from './indices_stats_helpers';

describe('storage explorer with no APM indices', () => {
  const apmEventClient = {
    indices: {
      transaction: 'traces-apm-missing',
      span: 'traces-apm-missing',
      metric: 'metrics-apm-missing',
      error: 'logs-apm-missing',
    },
  } as unknown as APMEventClient;

  const missingIndex = new Error('index_not_found_exception: no such index [traces-apm-missing]');

  function contextFor(client: object) {
    return {
      core: Promise.resolve({ elasticsearch: { client: { asCurrentUser: client } } }),
    } as unknown as ApmPluginRequestHandlerContext;
  }

  it('returns empty index statistics when APM indices have not been created', async () => {
    const get = jest.fn().mockResolvedValue({});
    const stats = jest.fn();
    const context = contextFor({ indices: { get, stats } });

    await expect(getTotalIndicesStats({ context, apmEventClient })).resolves.toEqual({
      _all: { total: { store: { size_in_bytes: 0 } } },
      indices: {},
    });
    expect(stats).not.toHaveBeenCalled();
  });

  it('does not hide unrelated index statistics errors', async () => {
    const securityError = new Error('security_exception: missing monitor privilege');
    const get = jest.fn().mockResolvedValue({ 'traces-apm-000001': {} });
    const stats = jest.fn().mockRejectedValue(securityError);
    const context = contextFor({ indices: { get, stats } });

    await expect(getTotalIndicesStats({ context, apmEventClient })).rejects.toBe(securityError);
  });

  it('keeps normal index statistics unchanged when indices exist', async () => {
    const normalStats = {
      _all: { total: { store: { size_in_bytes: 42 } } },
      indices: {
        'traces-apm-000001': {
          total: { store: { size_in_bytes: 42 } },
        },
      },
    };
    const get = jest.fn().mockResolvedValue({ 'traces-apm-000001': {} });
    const stats = jest.fn().mockResolvedValue(normalStats);
    const context = contextFor({ indices: { get, stats } });

    await expect(getTotalIndicesStats({ context, apmEventClient })).resolves.toBe(normalStats);
    expect(stats).toHaveBeenCalledWith({
      index: 'traces-apm-000001',
      expand_wildcards: 'all',
    });
  });

  it('returns an empty lifecycle map when APM indices have not been created', async () => {
    const get = jest.fn().mockResolvedValue({});
    const explainLifecycle = jest.fn();
    const context = contextFor({ indices: { get }, ilm: { explainLifecycle } });

    await expect(getIndicesLifecycleStatus({ context, apmEventClient })).resolves.toEqual({});
    expect(explainLifecycle).not.toHaveBeenCalled();
  });

  it('returns empty index information when APM indices have not been created', async () => {
    const get = jest.fn(async ({ ignore_unavailable }: { ignore_unavailable?: boolean }) => {
      if (!ignore_unavailable) {
        throw missingIndex;
      }
      return {};
    });
    const context = contextFor({ indices: { get } });

    await expect(getIndicesInfo({ context, apmEventClient })).resolves.toEqual({});
  });

  it('does not hide unrelated lifecycle errors', async () => {
    const securityError = new Error('security_exception: missing view_index_metadata privilege');
    const get = jest.fn().mockResolvedValue({ 'traces-apm-000001': {} });
    const explainLifecycle = jest.fn().mockRejectedValue(securityError);
    const context = contextFor({ indices: { get }, ilm: { explainLifecycle } });

    await expect(getIndicesLifecycleStatus({ context, apmEventClient })).rejects.toBe(securityError);
  });

  it('keeps lifecycle information for existing APM indices', async () => {
    const phases = { 'traces-apm-000001': { phase: 'hot' } };
    const get = jest.fn().mockResolvedValue({ 'traces-apm-000001': {} });
    const explainLifecycle = jest.fn().mockResolvedValue({ indices: phases });
    const context = contextFor({ indices: { get }, ilm: { explainLifecycle } });

    await expect(getIndicesLifecycleStatus({ context, apmEventClient })).resolves.toEqual(phases);
    expect(explainLifecycle).toHaveBeenCalledWith({
      index: 'traces-apm-000001',
      filter_path: 'indices.*.phase',
    });
  });

  it('preserves statistics for existing APM indices when only some configured indices are missing', async () => {
    const partialApmEventClient = {
      indices: {
        transaction: 'traces-apm-existing',
        span: 'traces-apm-missing',
        metric: 'metrics-apm-existing',
        error: 'logs-apm-missing',
      },
    } as unknown as APMEventClient;

    const survivingStats = {
      _all: { total: { store: { size_in_bytes: 42 } } },
      indices: {
        'traces-apm-existing': {
          total: { store: { size_in_bytes: 40 } },
        },
        'metrics-apm-existing': {
          total: { store: { size_in_bytes: 2 } },
        },
      },
    };

    const get = jest.fn().mockResolvedValue({
      'traces-apm-existing': {},
      'metrics-apm-existing': {},
    });
    const stats = jest.fn().mockResolvedValue(survivingStats);
    const context = contextFor({ indices: { get, stats } });

    await expect(
      getTotalIndicesStats({ context, apmEventClient: partialApmEventClient })
    ).resolves.toBe(survivingStats);
    expect(stats).toHaveBeenCalledWith({
      index: 'traces-apm-existing,metrics-apm-existing',
      expand_wildcards: 'all',
    });
  });

  it('preserves lifecycle phases for existing APM indices when only some configured indices are missing', async () => {
    const partialApmEventClient = {
      indices: {
        transaction: 'traces-apm-existing',
        span: 'traces-apm-missing',
        metric: 'metrics-apm-existing',
        error: 'logs-apm-missing',
      },
    } as unknown as APMEventClient;

    const phases = {
      'traces-apm-existing': { phase: 'hot' },
      'metrics-apm-existing': { phase: 'warm' },
    };

    const get = jest.fn().mockResolvedValue({
      'traces-apm-existing': {},
      'metrics-apm-existing': {},
    });
    const explainLifecycle = jest.fn().mockResolvedValue({ indices: phases });
    const context = contextFor({ indices: { get }, ilm: { explainLifecycle } });

    await expect(
      getIndicesLifecycleStatus({ context, apmEventClient: partialApmEventClient })
    ).resolves.toEqual(phases);
    expect(explainLifecycle).toHaveBeenCalledWith({
      index: 'traces-apm-existing,metrics-apm-existing',
      filter_path: 'indices.*.phase',
    });
  });
});
