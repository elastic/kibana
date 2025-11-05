/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { accessKnownApmEventFields } from './access_known_fields';

describe('accessKnownApmEventFields', () => {
  const input = {
    '@timestamp': ['2024-10-10T10:10:10.000Z'],
    'service.name': ['node-svc'],
    'service.version': ['1.0.0'],
    'service.environment': ['production'],
    'agent.name': ['nodejs'],
    'links.span_id': ['link1', 'link2'],
  };

  it('should validate all required fields are present in the input document', () => {
    expect(() => accessKnownApmEventFields(input, ['@timestamp', 'service.name'])).not.toThrow();

    expect(() => accessKnownApmEventFields({}, ['@timestamp', 'service.name'])).toThrowError(
      'Missing required fields (@timestamp, service.name) in event'
    );
  });

  it('should return either single or array values for the various known field types', () => {
    const event = accessKnownApmEventFields(input, ['@timestamp', 'service.name']);

    expect(event('service.name')).not.toBeUndefined();
    expect(event('agent.name')).toBe('nodejs');
    expect(event('agent.version')).toBeUndefined();
    expect(event('links.span_id')).toEqual(['link1', 'link2']);
    expect(event('links.trace_id')).toBeUndefined();
  });
});
