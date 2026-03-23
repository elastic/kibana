/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ApmDocument, accessKnownApmEventFields } from './access_known_fields';
import type { FlattenedApmEvent } from './utility_types';

describe('accessKnownApmEventFields', () => {
  const input = {
    '@timestamp': ['2024-10-10T10:10:10.000Z'],
    'service.name': ['node-svc'],
    'service.version': ['1.0.0'],
    'service.environment': ['production'],
    'agent.name': ['nodejs'],
    'agent.version': [],
    'links.span_id': ['link1', 'link2'],
  };

  const smallInput = {
    '@timestamp': ['2024-10-10T10:10:10.000Z'],
    'service.name': ['node-svc'],
    'links.span_id': ['link1', 'link2'],
  };

  it('should return either single or array values for the various known field types', () => {
    const event = accessKnownApmEventFields(input as Partial<FlattenedApmEvent>).requireFields([
      '@timestamp',
      'service.name',
    ]);

    expect(event['service.name']).not.toBeUndefined();
    expect(event['agent.name']).toBe('nodejs');
    expect(event['agent.version']).toBeUndefined();
    expect(event['links.span_id']).toEqual(['link1', 'link2']);
    expect(event['links.trace_id']).toBeUndefined();
  });

  it('should validate all required fields are present in the input document', () => {
    expect(() =>
      accessKnownApmEventFields(input).requireFields(['@timestamp', 'service.name'])
    ).not.toThrow();

    expect(() =>
      accessKnownApmEventFields({}).requireFields(['@timestamp', 'service.name'])
    ).toThrowError('Missing required fields (@timestamp, service.name) in event');

    expect(() =>
      accessKnownApmEventFields({ ...input, 'service.name': [] }).requireFields([
        '@timestamp',
        'service.name',
      ])
    ).toThrowError('Missing required fields (service.name) in event');
  });

  it('exposes an `unflatten` method', () => {
    const event = accessKnownApmEventFields(smallInput).requireFields([
      '@timestamp',
      'service.name',
    ]);

    expect(typeof event.unflatten).toBe('function');

    const unflattened = event.unflatten();

    expect(unflattened).toEqual({
      '@timestamp': '2024-10-10T10:10:10.000Z',
      service: { name: 'node-svc' },
      links: { span_id: ['link1', 'link2'] },
    });
  });

  it('can be built into a new flattened object with the correct value formats', () => {
    const event = accessKnownApmEventFields(smallInput);

    const newEvent = event.build();

    expect(newEvent).toEqual({
      '@timestamp': '2024-10-10T10:10:10.000Z',
      'service.name': 'node-svc',
      'links.span_id': ['link1', 'link2'],
    });
  });

  it('exposes a `requireFields` method, which validates the original object again to narrow its definition', () => {
    const event = accessKnownApmEventFields(smallInput).requireFields(['@timestamp']);

    let requiredEvent: ApmDocument<typeof smallInput, '@timestamp' | 'service.name'> | undefined;

    expect(() => {
      requiredEvent = event.requireFields(['service.name']);
    }).not.toThrow();

    expect(requiredEvent?.['service.name']).toBe('node-svc');

    expect(() => requiredEvent?.requireFields(['agent.name'])).toThrowError(
      'Missing required fields (agent.name) in event'
    );
  });

  it('prevents mutations on the original object', () => {
    const event = accessKnownApmEventFields(smallInput as Partial<FlattenedApmEvent>);

    // The proxied object is immutable. It will prevent mutations and will throw a TypeError
    expect(() => {
      // Disabling type checking here to ensure we also have runtime protection of immutability,
      // so people can't just cast their way out of this. Normally, doing the setter op will
      // error at compile time.
      // @ts-expect-error
      event['agent.name'] = 'nodejs';
    }).toThrowError("'set' on proxy: trap returned falsish for property 'agent.name'");
  });

  it('checks for the existence of any fields with values that partially match a key string', () => {
    const event = accessKnownApmEventFields(input);

    expect(event.containsFields('service')).toBe(true);
    expect(event.containsFields('links')).toBe(true);
    expect(event.containsFields('transaction')).toBe(false);
    expect(event.containsFields('agent.version')).toBe(false);
  });

  it('lists only the keys that exist on the original object', () => {
    const event = accessKnownApmEventFields(smallInput);

    expect(Object.keys(event)).toEqual(['@timestamp', 'service.name', 'links.span_id']);
    expect(Object.entries(event)).toEqual([
      ['@timestamp', '2024-10-10T10:10:10.000Z'],
      ['service.name', 'node-svc'],
      ['links.span_id', ['link1', 'link2']],
    ]);
  });
});
