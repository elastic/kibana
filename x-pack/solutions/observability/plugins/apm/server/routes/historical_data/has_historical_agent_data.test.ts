/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { hasHistoricalAgentData } from './has_historical_agent_data';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

function createApmEventClientMock(totalPerCall: number[]): {
  apmEventClient: APMEventClient;
  search: jest.Mock;
} {
  let call = 0;
  const search = jest.fn().mockImplementation(async () => {
    const value = totalPerCall[Math.min(call, totalPerCall.length - 1)];
    call += 1;
    return { hits: { total: { value } } };
  });

  return {
    apmEventClient: { search } as unknown as APMEventClient,
    search,
  };
}

describe('hasHistoricalAgentData', () => {
  it('returns true from the recent time-bounded check without running the unbounded check', async () => {
    const { apmEventClient, search } = createApmEventClientMock([1]);

    const result = await hasHistoricalAgentData(apmEventClient);

    expect(result).toBe(true);
    // only the fast path should have run
    expect(search).toHaveBeenCalledTimes(1);

    const [, firstParams] = search.mock.calls[0];
    // the recent check is scoped to transaction + error only (no metric)
    expect(firstParams.apm.events).toEqual([ProcessorEvent.error, ProcessorEvent.transaction]);
    // and it is time-bounded via an @timestamp range filter
    expect(firstParams.query.bool.filter[0].range).toHaveProperty('@timestamp');
  });

  it('falls back to the hot/warm check when the recent window is empty', async () => {
    // recent window empty, hot/warm has data
    const { apmEventClient, search } = createApmEventClientMock([0, 1]);

    const result = await hasHistoricalAgentData(apmEventClient);

    expect(result).toBe(true);
    expect(search).toHaveBeenCalledTimes(2);

    const [, secondParams] = search.mock.calls[1];
    // the broadened check includes metric events again
    expect(secondParams.apm.events).toEqual([
      ProcessorEvent.error,
      ProcessorEvent.metric,
      ProcessorEvent.transaction,
    ]);
    expect(secondParams.query.terms._tier).toEqual(['data_hot', 'data_warm']);
  });

  it('falls back to the unbounded all-tiers check when recent and hot/warm are empty', async () => {
    const { apmEventClient, search } = createApmEventClientMock([0, 0, 1]);

    const result = await hasHistoricalAgentData(apmEventClient);

    expect(result).toBe(true);
    expect(search).toHaveBeenCalledTimes(3);

    const [, thirdParams] = search.mock.calls[2];
    // the unbounded check has no tier/time filter
    expect(thirdParams.query).toBeUndefined();
  });

  it('returns false when no data is found anywhere', async () => {
    const { apmEventClient, search } = createApmEventClientMock([0, 0, 0]);

    const result = await hasHistoricalAgentData(apmEventClient);

    expect(result).toBe(false);
    expect(search).toHaveBeenCalledTimes(3);
  });
});
