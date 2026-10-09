/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/apm-types-shared';
import type { APMEventClient } from './create_es_client/create_apm_event_client';
import { hasApmData } from './has_apm_data';

const makeHits = (value: number) => ({ hits: { total: { value } } });

const OPERATION = 'observability_overview_has_apm_data';

describe('hasApmData', () => {
  it('returns true immediately when phase 1 finds data (no phase 2 call)', async () => {
    const search = jest.fn().mockResolvedValue(makeHits(1));
    const apmEventClient = { search } as unknown as APMEventClient;

    expect(await hasApmData(apmEventClient, OPERATION)).toBe(true);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('falls back to phase 2 when phase 1 finds nothing', async () => {
    const search = jest.fn().mockResolvedValueOnce(makeHits(0)).mockResolvedValueOnce(makeHits(1));
    const apmEventClient = { search } as unknown as APMEventClient;

    expect(await hasApmData(apmEventClient, OPERATION)).toBe(true);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('returns false when both phases find nothing', async () => {
    const search = jest.fn().mockResolvedValue(makeHits(0));
    const apmEventClient = { search } as unknown as APMEventClient;

    expect(await hasApmData(apmEventClient, OPERATION)).toBe(false);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('phase 1 carries an @timestamp range and cold/frozen tier exclusion', async () => {
    const search = jest.fn().mockResolvedValue(makeHits(0));
    const apmEventClient = { search } as unknown as APMEventClient;

    await hasApmData(apmEventClient, OPERATION);

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

  it('phase 2 carries no query (unbounded)', async () => {
    const search = jest.fn().mockResolvedValue(makeHits(0));
    const apmEventClient = { search } as unknown as APMEventClient;

    await hasApmData(apmEventClient, OPERATION);

    const [, phase2Params] = search.mock.calls[1];
    expect(phase2Params.query).toBeUndefined();
  });

  it('targets all three processor events in both phases', async () => {
    const search = jest.fn().mockResolvedValue(makeHits(0));
    const apmEventClient = { search } as unknown as APMEventClient;

    await hasApmData(apmEventClient, OPERATION);

    const expectedEvents = expect.arrayContaining([
      ProcessorEvent.transaction,
      ProcessorEvent.error,
      ProcessorEvent.metric,
    ]);
    expect(search.mock.calls[0][1].apm.events).toEqual(expectedEvents);
    expect(search.mock.calls[1][1].apm.events).toEqual(expectedEvents);
  });

  it('forwards the caller operation name to every request', async () => {
    const search = jest.fn().mockResolvedValue(makeHits(0));
    const apmEventClient = { search } as unknown as APMEventClient;

    await hasApmData(apmEventClient, OPERATION);

    expect(search.mock.calls.map(([operationName]) => operationName)).toEqual([
      OPERATION,
      OPERATION,
    ]);
  });
});
