/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseEan } from './parse_ean';

describe('parseEan function', () => {
  it('should parse a valid EAN and return the kind and id as separate values', () => {
    const ean = 'host:some-id-123';
    const { kind, id } = parseEan(ean);
    expect(kind).toBe('host');
    expect(id).toBe('some-id-123');
  });

  it('should throw an error when the provided EAN does not have enough segments', () => {
    expect(() => parseEan('invalid-ean')).toThrowError('not a valid EAN');
    expect(() => parseEan('invalid-ean:')).toThrowError('not a valid EAN');
    expect(() => parseEan(':invalid-ean')).toThrowError('not a valid EAN');
  });

  it('should throw an error when the provided EAN has too many segments', () => {
    const ean = 'host:invalid:segments';
    expect(() => parseEan(ean)).toThrowError('not a valid EAN');
  });

  it('should throw an error when the provided EAN includes an unsupported "kind" value', () => {
    const ean = 'unsupported_kind:some-id-123';
    expect(() => parseEan(ean)).toThrowError('not a valid EAN');
  });
});
