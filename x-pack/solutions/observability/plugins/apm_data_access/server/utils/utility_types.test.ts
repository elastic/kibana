/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureRequiredApmFields, getMissingRequiredApmFields } from './utility_types';

describe('getMissingRequiredApmFields', () => {
  it('returns an empty array when every required field has a value', () => {
    expect(
      getMissingRequiredApmFields({ 'span.id': ['span-1'], 'service.name': ['my-service'] }, [
        'span.id',
        'service.name',
      ])
    ).toEqual([]);
  });

  it('returns the fields that are absent', () => {
    expect(
      getMissingRequiredApmFields({ 'span.id': ['span-1'] }, ['span.id', 'service.name'])
    ).toEqual(['service.name']);
  });

  it('treats null and empty arrays as missing', () => {
    expect(
      getMissingRequiredApmFields({ 'span.id': [], 'service.name': null }, [
        'span.id',
        'service.name',
      ])
    ).toEqual(['span.id', 'service.name']);
  });

  it('keeps the order of the required fields', () => {
    expect(getMissingRequiredApmFields({}, ['service.name', '@timestamp', 'span.id'])).toEqual([
      'service.name',
      '@timestamp',
      'span.id',
    ]);
  });
});

describe('ensureRequiredApmFields', () => {
  it('does not throw when every required field has a value', () => {
    expect(() => ensureRequiredApmFields({ 'span.id': ['span-1'] }, ['span.id'])).not.toThrow();
  });

  it('throws listing every missing field', () => {
    expect(() => ensureRequiredApmFields({}, ['span.id', 'service.name'])).toThrow(
      'Missing required fields (span.id, service.name) in event'
    );
  });
});
