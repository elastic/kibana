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

  it('returns empty index statistics instead of surfacing an absent-index error', async () => {
    const emptyStats = {
      _all: { total: { store: { size_in_bytes: 0 } } },
      indices: {},
    };
    const stats = jest.fn(async ({ ignore_unavailable }: { ignore_unavailable?: boolean }) => {
      if (!ignore_unavailable) {
        throw missingIndex;
      }
      return emptyStats;
    });
    const context = contextFor({ indices: { stats } });

    await expect(getTotalIndicesStats({ context, apmEventClient })).resolves.toEqual(emptyStats);
  });

  it('returns an empty lifecycle map when APM indices have not been created', async () => {
    const explainLifecycle = jest.fn(
      async ({ ignore_unavailable }: { ignore_unavailable?: boolean }) => {
        if (!ignore_unavailable) {
          throw missingIndex;
        }
        return { indices: {} };
      }
    );
    const context = contextFor({ ilm: { explainLifecycle } });

    await expect(getIndicesLifecycleStatus({ context, apmEventClient })).resolves.toEqual({});
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
    const explainLifecycle = jest.fn().mockRejectedValue(securityError);
    const context = contextFor({ ilm: { explainLifecycle } });

    await expect(getIndicesLifecycleStatus({ context, apmEventClient })).rejects.toBe(securityError);
  });

  it('keeps lifecycle information for existing APM indices', async () => {
    const phases = { 'traces-apm-000001': { phase: 'hot' } };
    const explainLifecycle = jest.fn().mockResolvedValue({ indices: phases });
    const context = contextFor({ ilm: { explainLifecycle } });

    await expect(getIndicesLifecycleStatus({ context, apmEventClient })).resolves.toEqual(phases);
  });
});
