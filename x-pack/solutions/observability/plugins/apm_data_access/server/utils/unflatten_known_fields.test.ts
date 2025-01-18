/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unflattenKnownApmEventFields } from './unflatten_known_fields';

describe('unflattenKnownApmEventFields', () => {
  it('should return an empty object when input is empty', () => {
    const input = {};
    const expectedOutput = {};
    expect(unflattenKnownApmEventFields(input)).toEqual(expectedOutput);
  });

  it('should correctly unflatten a simple flat input', () => {
    const input = {
      '@timestamp': '2024-10-10T10:10:10.000Z',
    };
    const expectedOutput = {
      '@timestamp': '2024-10-10T10:10:10.000Z',
    };
    expect(unflattenKnownApmEventFields(input)).toEqual(expectedOutput);
  });

  it('should override unknown fields', () => {
    const input = {
      'service.name': 'node-svc',
      'service.name.text': 'node-svc',
    };
    const expectedOutput = {
      service: {
        name: 'node-svc',
      },
    };

    expect(unflattenKnownApmEventFields(input)).toEqual(expectedOutput);
  });

  it('should correctly unflatten multiple nested fields', () => {
    const input = {
      'service.name': 'node-svc',
      'service.version': '1.0.0',
      'service.environment': 'production',
      'agent.name': 'nodejs',
    };
    const expectedOutput = {
      service: {
        name: 'node-svc',
        version: '1.0.0',
        environment: 'production',
      },
      agent: {
        name: 'nodejs',
      },
    };
    expect(unflattenKnownApmEventFields(input)).toEqual(expectedOutput);
  });

  it('should handle multiple values for multi-valued fields', () => {
    const input = {
      'service.name': 'node-svc',
      'service.tags': ['foo', 'bar'],
    };
    const expectedOutput = {
      service: {
        name: 'node-svc',
        tags: ['foo', 'bar'],
      },
    };
    expect(unflattenKnownApmEventFields(input)).toEqual(expectedOutput);
  });

  it('should correctly unflatten with empty multi-valued fields', () => {
    const input = {
      'service.name': 'node-svc',
      'service.tags': [],
    };
    const expectedOutput = {
      service: {
        name: 'node-svc',
        tags: [],
      },
    };
    expect(unflattenKnownApmEventFields(input)).toEqual(expectedOutput);
  });

  it('should retain unknown fields in the output', () => {
    const input = {
      'service.name': 'node-svc',
      'unknown.texts': ['foo', 'bar'],
      'unknown.field': 'foo',
      unknonwField: 'bar',
    };
    const expectedOutput = {
      service: {
        name: 'node-svc',
      },
      unknown: {
        field: 'foo',
        texts: ['foo', 'bar'],
      },
      unknonwField: 'bar',
    };
    expect(unflattenKnownApmEventFields(input)).toEqual(expectedOutput);
  });

  it('should correctly unflatten nested fields with mandatory field', () => {
    const input = {
      'service.name': 'node-svc',
      'service.environment': undefined,
    };

    const requiredFields: ['service.name'] = ['service.name'];

    const expectedOutput = {
      service: {
        name: 'node-svc',
      },
    };
    expect(unflattenKnownApmEventFields(input, requiredFields)).toEqual(expectedOutput);
  });

  it('should throw an exception when mandatory field is not in the input', () => {
    const input = {
      'service.environment': 'PROD',
    };

    const requiredFields: ['service.name'] = ['service.name'];

    // @ts-expect-error
    expect(() => unflattenKnownApmEventFields(input, requiredFields)).toThrowError(
      'Missing required fields service.name in event'
    );
  });
});
