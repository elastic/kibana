/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateShareToken } from './generate_share_token';

describe('generateShareToken', () => {
  it('should generate a token of 40 chars', async () => {
    expect(await generateShareToken()).toHaveLength(40);
  });

  it('should contain only expected chars', async () => {
    expect(await generateShareToken()).toMatch(/^[a-zA-Z0-9]{40}$/);
  });
});
