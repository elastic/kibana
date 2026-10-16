/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { fetchPrefetchedContext } from './prefetched_context';

describe('fetchPrefetchedContext', () => {
  const original = process.env.SIGEVENTS_EVAL_PREFETCH_CONTEXT;
  const makeFetch = () => jest.fn().mockResolvedValue({ query_kis: [] });
  const asHandler = (fetch: jest.Mock): HttpHandler => fetch;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.SIGEVENTS_EVAL_PREFETCH_CONTEXT;
    } else {
      process.env.SIGEVENTS_EVAL_PREFETCH_CONTEXT = original;
    }
  });

  it('fetches nothing unless the evaluation enables it', async () => {
    delete process.env.SIGEVENTS_EVAL_PREFETCH_CONTEXT;
    const fetch = makeFetch();

    expect(
      await fetchPrefetchedContext({ fetch: asHandler(fetch), detections: [{ rule_uuid: 'r1' }] })
    ).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('asks the workflow route for the distinct rules and sources of the batch', async () => {
    process.env.SIGEVENTS_EVAL_PREFETCH_CONTEXT = 'true';
    const fetch = makeFetch();

    const context = await fetchPrefetchedContext({
      fetch: asHandler(fetch),
      detections: [
        { rule_uuid: 'r1', source_id: 's1' },
        { rule_uuid: 'r1', source_id: 's1' },
        { rule_uuid: 'r2', source_id: 's1' },
      ],
    });

    expect(context).toEqual({ query_kis: [] });
    expect(fetch).toHaveBeenCalledWith('/internal/significant_events/discovery/_context', {
      method: 'POST',
      body: JSON.stringify({ rule_uuids: ['r1', 'r2'], source_ids: ['s1'] }),
    });
  });

  it('fetches nothing for a batch without rules', async () => {
    process.env.SIGEVENTS_EVAL_PREFETCH_CONTEXT = 'true';
    const fetch = makeFetch();

    expect(
      await fetchPrefetchedContext({ fetch: asHandler(fetch), detections: [] })
    ).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});
