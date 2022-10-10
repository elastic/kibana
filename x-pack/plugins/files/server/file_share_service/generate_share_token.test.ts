/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateShareToken } from './generate_share_token';

describe('generateShareToken', () => {
  it('should contain only expected chars of a given length', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateShareToken()).toMatch(/^[a-zA-O0-9]{40}$/);
    }
  });
});
