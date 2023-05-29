/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMockArgs } from '../mocks';
import { bulkGet } from './bulk_get';

describe('bulkGet', () => {
  describe('throwErrorIfCaseIdsReachTheLimit', () => {
    const clientArgs = createCasesClientMockArgs();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('throws if the requested cases are more than 1000', async () => {
      const ids = Array(1001).fill('test');

      await expect(bulkGet({ ids }, clientArgs)).rejects.toThrow(
        'Maximum request limit of 1000 cases reached'
      );
    });
  });
});
