/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { comment } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { bulkCreate } from './bulk_create';

describe('bulkCreate', () => {
  const clientArgs = createCasesClientMockArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws with excess fields', async () => {
    await expect(
      // @ts-expect-error: excess attribute
      bulkCreate({ attachments: [{ ...comment, foo: 'bar' }], caseId: 'test-case' }, clientArgs)
    ).rejects.toThrow('invalid keys "foo"');
  });
});
