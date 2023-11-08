/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BULK_GET_CASES } from '../../../common/constants';
import { createCasesClientMockArgs } from '../mocks';
import { bulkGet } from './bulk_get';

describe('bulkGet', () => {
  describe('errors', () => {
    const clientArgs = createCasesClientMockArgs();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it(`throws when trying to fetch more than ${MAX_BULK_GET_CASES} cases`, async () => {
      await expect(
        bulkGet({ ids: Array(MAX_BULK_GET_CASES + 1).fill('foobar') }, clientArgs)
      ).rejects.toThrow(
        `Error: The length of the field ids is too long. Array must be of length <= ${MAX_BULK_GET_CASES}.`
      );
    });

    it('throws when trying to fetch zero cases', async () => {
      await expect(bulkGet({ ids: [] }, clientArgs)).rejects.toThrow(
        'Error: The length of the field ids is too short. Array must be of length >= 1.'
      );
    });

    it('throws with excess fields', async () => {
      await expect(
        bulkGet(
          // @ts-expect-error: excess attribute
          { ids: ['1'], foo: 'bar' },
          clientArgs
        )
      ).rejects.toThrow('invalid keys "foo"');
    });
  });
});
