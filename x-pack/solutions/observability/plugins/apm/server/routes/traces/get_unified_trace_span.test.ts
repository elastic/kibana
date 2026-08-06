/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUnifiedTraceSpan } from './get_unified_trace_span';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

const INPUT_MESSAGES_FIELD = 'attributes.gen_ai.input.messages';

function createApmEventClientMock(hit?: {
  fields: Record<string, unknown[]>;
  _source?: unknown;
  _ignored?: string[];
}): APMEventClient {
  return {
    search: jest.fn().mockResolvedValue({
      hits: { hits: hit ? [{ _id: 'doc-1', _index: 'traces-otel', ...hit }] : [] },
    }),
  } as unknown as APMEventClient;
}

async function callGetUnifiedTraceSpan(apmEventClient: APMEventClient) {
  return getUnifiedTraceSpan({
    spanId: 'span-1',
    traceId: 'trace-1',
    apmEventClient,
    start: 0,
    end: 1,
  });
}

describe('getUnifiedTraceSpan', () => {
  it('returns undefined when there is no hit', async () => {
    const result = await callGetUnifiedTraceSpan(createApmEventClientMock());
    expect(result).toBeUndefined();
  });

  it('requests the long gen_ai fields from _source', async () => {
    const apmEventClient = createApmEventClientMock({ fields: { 'span.id': ['span-1'] } });
    await callGetUnifiedTraceSpan(apmEventClient);

    const searchParams = (apmEventClient.search as jest.Mock).mock.calls[0][1];
    expect(searchParams._source).toEqual(
      expect.arrayContaining([INPUT_MESSAGES_FIELD, 'attributes.gen_ai.output.messages'])
    );
  });

  it('merges an ignored gen_ai message field from _source into the returned event', async () => {
    const longMessage = '{"role":"user","content":"' + 'x'.repeat(2000) + '"}';
    const result = await callGetUnifiedTraceSpan(
      createApmEventClientMock({
        fields: { 'span.id': ['span-1'] },
        _ignored: [INPUT_MESSAGES_FIELD],
        _source: { attributes: { 'gen_ai.input.messages': [longMessage] } },
      })
    );

    expect((result as any)?.attributes?.gen_ai?.input?.messages).toEqual([longMessage]);
  });

  it('does not overwrite an indexed value that is not flagged as ignored', async () => {
    const indexed = ['{"role":"user","content":"indexed"}'];
    const result = await callGetUnifiedTraceSpan(
      createApmEventClientMock({
        fields: { 'span.id': ['span-1'], [INPUT_MESSAGES_FIELD]: indexed },
        _source: { attributes: { 'gen_ai.input.messages': ['{"role":"user","content":"other"}'] } },
      })
    );

    expect((result as any)?.attributes?.gen_ai?.input?.messages).toEqual(indexed);
  });

  it('keeps _id and _index on the returned event', async () => {
    const result = await callGetUnifiedTraceSpan(
      createApmEventClientMock({ fields: { 'span.id': ['span-1'] } })
    );

    expect(result?._id).toBe('doc-1');
    expect(result?._index).toBe('traces-otel');
  });
});
