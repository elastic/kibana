/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isDiffPathProtocol } from './is_diff_path_protocol';

describe('Fleet - isDiffPathProtocol', () => {
  it('returns true for different paths', () => {
    expect(
      isDiffPathProtocol([
        'http://localhost:8888/abc',
        'http://localhost:8888/abc',
        'http://localhost:8888/efg',
      ])
    ).toBe(true);
  });
  it('returns true for different protocols', () => {
    expect(
      isDiffPathProtocol([
        'http://localhost:8888/abc',
        'https://localhost:8888/abc',
        'http://localhost:8888/abc',
      ])
    ).toBe(true);
  });
  it('returns false for same paths and protocols and different host or port', () => {
    expect(
      isDiffPathProtocol([
        'http://localhost:8888/abc',
        'http://localhost2:8888/abc',
        'http://localhost:8883/abc',
      ])
    ).toBe(false);
  });
  it('returns false for one url', () => {
    expect(isDiffPathProtocol(['http://localhost:8888/abc'])).toBe(false);
  });
});
