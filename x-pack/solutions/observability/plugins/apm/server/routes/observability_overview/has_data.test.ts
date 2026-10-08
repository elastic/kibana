/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/apm-types-shared';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getHasData } from './has_data';

const defaultIndices = {
  transaction: 'traces-apm*,apm-*',
  span: 'traces-apm*,apm-*',
  error: 'logs-apm*,apm-*',
  metric: 'metrics-apm*,apm-*',
  onboarding: 'apm-*',
  sourcemap: 'apm-*',
} as APMIndices;

const makeHits = (value: number) => ({ hits: { total: { value } } });

describe('getHasData', () => {
  it('returns true immediately when phase 1 finds data (no phase 2 call)', async () => {
    const search = jest.fn().mockResolvedValue(makeHits(1));
    const apmEventClient = { search } as unknown as APMEventClient;

    const result = await getHasData({ indices: defaultIndices, apmEventClient });

    expect(result).toEqual({ hasData: true, indices: defaultIndices });
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('falls back to phase 2 when phase 1 finds nothing', async () => {
    const search = jest.fn().mockResolvedValueOnce(makeHits(0)).mockResolvedValueOnce(makeHits(1));
    const apmEventClient = { search } as unknown as APMEventClient;

    const result = await getHasData({ indices: defaultIndices, apmEventClient });

    expect(result).toEqual({ hasData: true, indices: defaultIndices });
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('returns false when both phases find nothing', async () => {
    const search = jest.fn().mockResolvedValue(makeHits(0));
    const apmEventClient = { search } as unknown as APMEventClient;

    const result = await getHasData({ indices: defaultIndices, apmEventClient });

    expect(result).toEqual({ hasData: false, indices: defaultIndices });
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('phase 1 carries an @timestamp range and cold/frozen tier exclusion', async () => {
    const search = jest.fn().mockResolvedValue(makeHits(0));
    const apmEventClient = { search } as unknown as APMEventClient;

    await getHasData({ indices: defaultIndices, apmEventClient });

    const [, phase1Params] = search.mock.calls[0];
    expect(phase1Params.query?.bool?.filter).toEqual(
      expect.arrayContaining([
        { range: { '@timestamp': { gte: 'now-24h/h' } } },
        expect.objectContaining({
          bool: {
            must_not: [{ terms: { _tier: expect.arrayContaining(['data_cold', 'data_frozen']) } }],
          },
        }),
      ])
    );
  });

  it('phase 1 targets all three processor events', async () => {
    const search = jest.fn().mockResolvedValue(makeHits(0));
    const apmEventClient = { search } as unknown as APMEventClient;

    await getHasData({ indices: defaultIndices, apmEventClient });

    const [, phase1Params] = search.mock.calls[0];
    expect(phase1Params.apm.events).toEqual(
      expect.arrayContaining([
        ProcessorEvent.transaction,
        ProcessorEvent.error,
        ProcessorEvent.metric,
      ])
    );
  });

  it('phase 2 carries no query (unbounded)', async () => {
    const search = jest.fn().mockResolvedValue(makeHits(0));
    const apmEventClient = { search } as unknown as APMEventClient;

    await getHasData({ indices: defaultIndices, apmEventClient });

    const [, phase2Params] = search.mock.calls[1];
    expect(phase2Params.query).toBeUndefined();
  });

  it('echoes indices back in the response', async () => {
    const search = jest.fn().mockResolvedValue(makeHits(0));
    const apmEventClient = { search } as unknown as APMEventClient;

    const result = await getHasData({ indices: defaultIndices, apmEventClient });

    expect(result.indices).toBe(defaultIndices);
  });

  it('returns hasData: false when the client throws', async () => {
    const search = jest.fn().mockRejectedValue(new Error('ES cluster unhealthy'));
    const apmEventClient = { search } as unknown as APMEventClient;

    const result = await getHasData({ indices: defaultIndices, apmEventClient });

    expect(result).toEqual({ hasData: false, indices: defaultIndices });
  });
});
