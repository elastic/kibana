/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { accessKnownApmEventFields } from './access_known_fields';
import type { FlattenedApmEvent } from './utility_types';

describe('accessKnownApmEventFields', () => {
  const input = {
    '@timestamp': ['2024-10-10T10:10:10.000Z'],
    'service.name': ['node-svc'],
    'service.version': ['1.0.0'],
    'service.environment': ['production'],
    'agent.name': ['nodejs'],
    'links.span_id': ['link1', 'link2'],
  };

  it('should return either single or array values for the various known field types', () => {
    const event = accessKnownApmEventFields(input as Partial<FlattenedApmEvent>, [
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
    expect(() => accessKnownApmEventFields(input, ['@timestamp', 'service.name'])).not.toThrow();

    expect(() => accessKnownApmEventFields({}, ['@timestamp', 'service.name'])).toThrowError(
      'Missing required fields (@timestamp, service.name) in event'
    );

    expect(() =>
      accessKnownApmEventFields({ ...input, 'service.name': [] }, ['@timestamp', 'service.name'])
    ).toThrowError('Missing required fields (service.name) in event');
  });

  it('exposes an `unflatten` method', () => {
    const smallInput = {
      '@timestamp': ['2024-10-10T10:10:10.000Z'],
      'service.name': ['node-svc'],
      'links.span_id': ['link1', 'link2'],
    };

    const event = accessKnownApmEventFields(smallInput, ['@timestamp', 'service.name']);

    expect(typeof event.unflatten).toBe('function');

    const unflattened = event.unflatten();

    expect(unflattened).toEqual({
      '@timestamp': '2024-10-10T10:10:10.000Z',
      service: { name: 'node-svc' },
      links: { span_id: ['link1', 'link2'] },
    });
  });

  it('prevents mutations on the original object', () => {
    const smallInput = {
      '@timestamp': ['2024-10-10T10:10:10.000Z'],
      'service.name': ['node-svc'],
      'links.span_id': ['link1', 'link2'],
    };

    const event = accessKnownApmEventFields(smallInput as Partial<FlattenedApmEvent>);

    // The proxied object is immutable. It will prevent mutations and will throw a TypeError
    expect(() => {
      // Disabling type checking here to ensure we also have runtime protection of immutability,
      // so people can't just cast their way out of this. Normally, doing the setter op will
      // error at compile time.
      // @ts-ignore
      event['agent.name'] = 'nodejs';
    }).toThrowError("'set' on proxy: trap returned falsish for property 'agent.name'");
  });
});
