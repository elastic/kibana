/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BULK_GET_ATTACHMENTS } from '../../../common/constants';
import { createCasesClientMockArgs, createCasesClientMock } from '../mocks';
import { bulkGet } from './bulk_get';

describe('bulkGet', () => {
  describe('errors', () => {
    const casesClient = createCasesClientMock();
    const clientArgs = createCasesClientMockArgs();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it(`throws when trying to fetch more than ${MAX_BULK_GET_ATTACHMENTS} attachments`, async () => {
      await expect(
        bulkGet(
          { attachmentIDs: Array(MAX_BULK_GET_ATTACHMENTS + 1).fill('foobar'), caseID: '123' },
          clientArgs,
          casesClient
        )
      ).rejects.toThrow(
        `Error: The length of the field ids is too long. Array must be of length <= ${MAX_BULK_GET_ATTACHMENTS}.`
      );
    });

    it('throws when trying to fetch zero attachments', async () => {
      await expect(
        bulkGet({ attachmentIDs: [], caseID: '123' }, clientArgs, casesClient)
      ).rejects.toThrow(
        'Error: The length of the field ids is too short. Array must be of length >= 1.'
      );
    });
  });
});
