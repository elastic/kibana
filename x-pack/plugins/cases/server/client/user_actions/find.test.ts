/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockClient } from '../metrics/test_utils/client';
import { createCasesClientMockArgs } from '../mocks';
import { find } from './find';

describe('addComment', () => {
  const client = createMockClient();
  const clientArgs = createCasesClientMockArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws with excess fields', async () => {
    await expect(
      // @ts-expect-error: excess attribute
      find({ caseId: 'test-case', params: { foo: 'bar' } }, client, clientArgs)
    ).rejects.toThrow('invalid keys "foo"');
  });
});
