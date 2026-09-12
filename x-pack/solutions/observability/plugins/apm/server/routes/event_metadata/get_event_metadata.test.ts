/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getEventMetadata } from './get_event_metadata';
import { getFieldFromSource } from './get_field_from_source';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

const INPUT_MESSAGES_FIELD = 'attributes.gen_ai.input.messages';
const OUTPUT_MESSAGES_FIELD = 'attributes.gen_ai.output.messages';

function createApmEventClientMock(hit: {
  fields: Record<string, unknown[]>;
  _source?: unknown;
  _ignored?: string[];
}): APMEventClient {
  return {
    search: jest.fn().mockResolvedValue({ hits: { hits: [hit] } }),
  } as unknown as APMEventClient;
}

async function callGetEventMetadata(apmEventClient: APMEventClient) {
  return getEventMetadata({
    apmEventClient,
    processorEvent: ProcessorEvent.transaction,
    id: 'foo',
    start: 0,
    end: 1,
  });
}

describe('getEventMetadata', () => {
  it('returns the indexed fields untouched when nothing was ignored', async () => {
    const fields = {
      'service.name': ['opbeans-node'],
      [INPUT_MESSAGES_FIELD]: ['{"role":"user","content":"hi"}'],
    };
    const result = await callGetEventMetadata(createApmEventClientMock({ fields }));

    expect(result).toEqual(fields);
  });

  it('merges an ignored field from an OTel-shaped _source (flattened key inside attributes)', async () => {
    const longMessage = '{"role":"user","content":"' + 'x'.repeat(2000) + '"}';
    const result = await callGetEventMetadata(
      createApmEventClientMock({
        fields: { 'service.name': ['opbeans-node'] },
        _ignored: [INPUT_MESSAGES_FIELD],
        _source: { attributes: { 'gen_ai.input.messages': [longMessage] } },
      })
    );

    expect(result[INPUT_MESSAGES_FIELD]).toEqual([longMessage]);
    expect(result['service.name']).toEqual(['opbeans-node']);
  });

  it('merges an ignored field from a fully nested _source', async () => {
    const longMessage = '{"role":"assistant","content":"' + 'y'.repeat(2000) + '"}';
    const result = await callGetEventMetadata(
      createApmEventClientMock({
        fields: {},
        _ignored: [OUTPUT_MESSAGES_FIELD],
        _source: { attributes: { gen_ai: { output: { messages: longMessage } } } },
      })
    );

    expect(result[OUTPUT_MESSAGES_FIELD]).toEqual([longMessage]);
  });

  it('replaces a partial indexed array when the field is flagged as ignored', async () => {
    const shortMessage = '{"role":"user","content":"short"}';
    const longMessage = '{"role":"assistant","content":"' + 'z'.repeat(2000) + '"}';
    const result = await callGetEventMetadata(
      createApmEventClientMock({
        // only the short element survived indexing
        fields: { [INPUT_MESSAGES_FIELD]: [shortMessage] },
        _ignored: [INPUT_MESSAGES_FIELD],
        _source: { attributes: { 'gen_ai.input.messages': [shortMessage, longMessage] } },
      })
    );

    expect(result[INPUT_MESSAGES_FIELD]).toEqual([shortMessage, longMessage]);
  });

  it('does not overwrite an indexed field that is not flagged as ignored', async () => {
    const indexed = ['{"role":"user","content":"indexed"}'];
    const result = await callGetEventMetadata(
      createApmEventClientMock({
        fields: { [INPUT_MESSAGES_FIELD]: indexed },
        _source: { attributes: { 'gen_ai.input.messages': ['{"role":"user","content":"other"}'] } },
      })
    );

    expect(result[INPUT_MESSAGES_FIELD]).toEqual(indexed);
  });

  it('wraps a single string _source value in an array to match the fields API shape', async () => {
    const blob = '[{"role":"user","content":"legacy single JSON blob"}]';
    const result = await callGetEventMetadata(
      createApmEventClientMock({
        fields: {},
        _ignored: [INPUT_MESSAGES_FIELD],
        _source: { attributes: { 'gen_ai.input.messages': blob } },
      })
    );

    expect(result[INPUT_MESSAGES_FIELD]).toEqual([blob]);
  });

  it('leaves the field absent when it is missing from _source too', async () => {
    const result = await callGetEventMetadata(
      createApmEventClientMock({
        fields: { 'service.name': ['opbeans-node'] },
        _ignored: [INPUT_MESSAGES_FIELD],
        _source: { attributes: {} },
      })
    );

    expect(result[INPUT_MESSAGES_FIELD]).toBeUndefined();
  });

  it('preserves old behavior when _source and _ignored are absent', async () => {
    const fields = { 'service.name': ['opbeans-node'] };
    const result = await callGetEventMetadata(createApmEventClientMock({ fields }));

    expect(result).toEqual(fields);
  });

  it('merges from _source when field is absent from fields and not in _ignored', async () => {
    // Covers the fields[fieldName] == null branch independently of _ignored —
    // e.g. a stored-only field whose value was never returned by the fields API.
    const msg = '{"role":"user","content":"stored but not indexed"}';
    const result = await callGetEventMetadata(
      createApmEventClientMock({
        fields: { 'service.name': ['opbeans-node'] },
        _source: { attributes: { 'gen_ai.input.messages': [msg] } },
      })
    );

    expect(result[INPUT_MESSAGES_FIELD]).toEqual([msg]);
    expect(result['service.name']).toEqual(['opbeans-node']);
  });
});

describe('getFieldFromSource', () => {
  it('reads a flattened dotted key inside a container object', () => {
    expect(
      getFieldFromSource({ attributes: { 'gen_ai.input.messages': ['a'] } }, INPUT_MESSAGES_FIELD)
    ).toEqual(['a']);
  });

  it('reads a fully nested path', () => {
    expect(
      getFieldFromSource(
        { attributes: { gen_ai: { input: { messages: ['b'] } } } },
        INPUT_MESSAGES_FIELD
      )
    ).toEqual(['b']);
  });

  it('reads a fully flattened top-level key', () => {
    expect(getFieldFromSource({ [INPUT_MESSAGES_FIELD]: ['c'] }, INPUT_MESSAGES_FIELD)).toEqual([
      'c',
    ]);
  });

  it('returns undefined for null, non-object, or missing values', () => {
    expect(getFieldFromSource(null, INPUT_MESSAGES_FIELD)).toBeUndefined();
    expect(getFieldFromSource('string', INPUT_MESSAGES_FIELD)).toBeUndefined();
    expect(getFieldFromSource({}, INPUT_MESSAGES_FIELD)).toBeUndefined();
    expect(getFieldFromSource({ attributes: {} }, INPUT_MESSAGES_FIELD)).toBeUndefined();
  });
});
