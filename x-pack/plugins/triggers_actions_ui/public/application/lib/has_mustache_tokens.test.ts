/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuid } from 'uuid';

import { hasMustacheTokens } from './has_mustache_tokens';

describe('hasMustacheTokens', () => {
  test('returns false for empty string', () => {
    expect(hasMustacheTokens('')).toBe(false);
  });

  test('returns false for string without tokens', () => {
    expect(hasMustacheTokens(`some random string ${uuid()}`)).toBe(false);
  });

  test('returns true when a template token is present', () => {
    expect(hasMustacheTokens('{{context.timestamp}}')).toBe(true);
  });
});
