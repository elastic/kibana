/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeVersionString } from './normalize_version_string';

describe('Normalizing Version String', () => {
  it('Returns version string when valid', () => {
    const result = normalizeVersionString('1.2.30');
    expect(result).toBe('1.2.30');
  });
  it('Strips -SNAPSHOT from a valid string', () => {
    const result = normalizeVersionString('1.2.30-SNAPSHOT');
    expect(result).toBe('1.2.30');
  });
  it('Returns empty string when invalid', () => {
    const result = normalizeVersionString('foo-SNAPSHOT');
    expect(result).toBe('');
  });
});
