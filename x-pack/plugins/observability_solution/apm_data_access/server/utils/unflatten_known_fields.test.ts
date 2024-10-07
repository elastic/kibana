/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// unflatten_known_fields.test.ts
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

  it('should correctly unflatten nested fields', () => {
    const input = {
      'service.name': 'node-svc',
    };
    const expectedOutput = {
      service: {
        name: 'node-svc',
      },
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
});
