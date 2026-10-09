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

describe('storage explorer with missing APM indices', () => {
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

  it('returns empty index statistics when all configured APM indices are missing', async () => {
    const stats = jest.fn().mockRejectedValue(missingIndex);
    const context = contextFor({ indices: { stats } });

    await expect(getTotalIndicesStats({ context, apmEventClient })).resolves.toEqual({
      _all: { total: { store: { size_in_bytes: 0 } } },
      indices: {},
    });
    expect(stats).toHaveBeenCalledTimes(3);
  });

  it('does not hide unrelated index statistics errors', async () => {
    const securityError = new Error('security_exception: missing monitor privilege');
    const stats = jest.fn(async ({ index }: { index: string }) => {
      if (index === 'traces-apm-missing') {
        throw securityError;
      }
      throw missingIndex;
    });
    const context = contextFor({ indices: { stats } });

    await expect(getTotalIndicesStats({ context, apmEventClient })).rejects.toBe(securityError);
  });

  it('keeps normal index statistics unchanged when an index pattern resolves', async () => {
    const onePatternClient = {
      indices: {
        transaction: 'traces-apm-*',
        span: 'traces-apm-*',
        metric: 'traces-apm-*',
        error: 'traces-apm-*',
      },
    } as unknown as APMEventClient;

    const normalStats = {
      _all: { total: { store: { size_in_bytes: 42 } } },
      indices: {
        'traces-apm-000001': {
          total: { store: { size_in_bytes: 42 } },
        },
      },
    };
    const stats = jest.fn().mockResolvedValue(normalStats);
    const context = contextFor({ indices: { stats } });

    await expect(
      getTotalIndicesStats({ context, apmEventClient: onePatternClient })
    ).resolves.toEqual(normalStats);
    expect(stats).toHaveBeenCalledWith({
      index: 'traces-apm-*',
      expand_wildcards: 'all',
    });
  });

  it('returns an empty lifecycle map when all configured APM indices are missing', async () => {
    const explainLifecycle = jest.fn().mockRejectedValue(missingIndex);
    const context = contextFor({ ilm: { explainLifecycle } });

    await expect(getIndicesLifecycleStatus({ context, apmEventClient })).resolves.toEqual({});
    expect(explainLifecycle).toHaveBeenCalledTimes(3);
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
    const explainLifecycle = jest.fn(async ({ index }: { index: string }) => {
      if (index === 'traces-apm-missing') {
        throw securityError;
      }
      throw missingIndex;
    });
    const context = contextFor({ ilm: { explainLifecycle } });

    await expect(getIndicesLifecycleStatus({ context, apmEventClient })).rejects.toBe(
      securityError
    );
  });

  it('keeps lifecycle information for an existing APM index pattern', async () => {
    const onePatternClient = {
      indices: {
        transaction: 'traces-apm-*',
        span: 'traces-apm-*',
        metric: 'traces-apm-*',
        error: 'traces-apm-*',
      },
    } as unknown as APMEventClient;

    const phases = { 'traces-apm-000001': { phase: 'hot' } };
    const explainLifecycle = jest.fn().mockResolvedValue({ indices: phases });
    const context = contextFor({ ilm: { explainLifecycle } });

    await expect(
      getIndicesLifecycleStatus({ context, apmEventClient: onePatternClient })
    ).resolves.toEqual(phases);
    expect(explainLifecycle).toHaveBeenCalledWith({
      index: 'traces-apm-*',
      filter_path: 'indices.*.phase',
    });
  });

  it('preserves statistics for existing APM indices when only some configured patterns are missing', async () => {
    const partialApmEventClient = {
      indices: {
        transaction: 'traces-apm-existing-*',
        span: 'traces-apm-missing-*',
        metric: 'metrics-apm-existing-*',
        error: 'logs-apm-missing-*',
      },
    } as unknown as APMEventClient;

    const stats = jest.fn(async ({ index }: { index: string }) => {
      if (index.includes('missing')) {
        throw missingIndex;
      }
      const size = index.startsWith('traces') ? 40 : 2;
      const concreteIndex = index.replace('*', '000001');
      return {
        _all: { total: { store: { size_in_bytes: size } } },
        indices: {
          [concreteIndex]: {
            total: { store: { size_in_bytes: size } },
          },
        },
      };
    });
    const context = contextFor({ indices: { stats } });

    await expect(
      getTotalIndicesStats({ context, apmEventClient: partialApmEventClient })
    ).resolves.toEqual({
      _all: { total: { store: { size_in_bytes: 42 } } },
      indices: {
        'traces-apm-existing-000001': {
          total: { store: { size_in_bytes: 40 } },
        },
        'metrics-apm-existing-000001': {
          total: { store: { size_in_bytes: 2 } },
        },
      },
    });
  });

  it('preserves lifecycle phases for existing APM indices when only some configured patterns are missing', async () => {
    const partialApmEventClient = {
      indices: {
        transaction: 'traces-apm-existing-*',
        span: 'traces-apm-missing-*',
        metric: 'metrics-apm-existing-*',
        error: 'logs-apm-missing-*',
      },
    } as unknown as APMEventClient;

    const explainLifecycle = jest.fn(async ({ index }: { index: string }) => {
      if (index.includes('missing')) {
        throw missingIndex;
      }
      const concreteIndex = index.replace('*', '000001');
      return {
        indices: {
          [concreteIndex]: { phase: index.startsWith('traces') ? 'hot' : 'warm' },
        },
      };
    });
    const context = contextFor({ ilm: { explainLifecycle } });

    await expect(
      getIndicesLifecycleStatus({ context, apmEventClient: partialApmEventClient })
    ).resolves.toEqual({
      'traces-apm-existing-000001': { phase: 'hot' },
      'metrics-apm-existing-000001': { phase: 'warm' },
    });
  });

  it('keeps stats requests bounded to configured patterns instead of expanding concrete indices', async () => {
    const patternedApmEventClient = {
      indices: {
        transaction: 'traces-apm-*',
        span: 'traces-apm-*',
        metric: 'metrics-apm-*',
        error: 'logs-apm-*',
      },
    } as unknown as APMEventClient;

    const stats = jest.fn(async ({ index }: { index: string }) => ({
      _all: { total: { store: { size_in_bytes: 1 } } },
      indices: { [`${index}-000001`]: { total: { store: { size_in_bytes: 1 } } } },
    }));
    const context = contextFor({ indices: { stats } });

    await getTotalIndicesStats({ context, apmEventClient: patternedApmEventClient });

    expect(stats).toHaveBeenCalledTimes(3);
    expect(stats).toHaveBeenNthCalledWith(1, {
      index: 'traces-apm-*',
      expand_wildcards: 'all',
    });
    expect(stats).toHaveBeenNthCalledWith(2, {
      index: 'metrics-apm-*',
      expand_wildcards: 'all',
    });
    expect(stats).toHaveBeenNthCalledWith(3, {
      index: 'logs-apm-*',
      expand_wildcards: 'all',
    });
  });

  it('keeps ILM requests bounded to configured patterns instead of expanding concrete indices', async () => {
    const patternedApmEventClient = {
      indices: {
        transaction: 'traces-apm-*',
        span: 'traces-apm-*',
        metric: 'metrics-apm-*',
        error: 'logs-apm-*',
      },
    } as unknown as APMEventClient;

    const explainLifecycle = jest.fn(async ({ index }: { index: string }) => ({
      indices: { [`${index}-000001`]: { phase: 'hot' } },
    }));
    const context = contextFor({ ilm: { explainLifecycle } });

    await getIndicesLifecycleStatus({ context, apmEventClient: patternedApmEventClient });

    expect(explainLifecycle).toHaveBeenCalledTimes(3);
    expect(explainLifecycle).toHaveBeenNthCalledWith(1, {
      index: 'traces-apm-*',
      filter_path: 'indices.*.phase',
    });
    expect(explainLifecycle).toHaveBeenNthCalledWith(2, {
      index: 'metrics-apm-*',
      filter_path: 'indices.*.phase',
    });
    expect(explainLifecycle).toHaveBeenNthCalledWith(3, {
      index: 'logs-apm-*',
      filter_path: 'indices.*.phase',
    });
  });
});
