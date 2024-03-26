/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { MAX_BULK_GET_CASES } from '../../../common/constants';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { bulkGet } from './bulk_get';

describe('bulkGet', () => {
  const caseSO = mockCases[0];

  describe('errors', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.authorization.getAndEnsureAuthorizedEntities.mockResolvedValue({
      authorized: [caseSO],
      unauthorized: [],
    });

    clientArgs.services.attachmentService.getter.getCaseCommentStats.mockResolvedValue(new Map());

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

    it('constructs the case error correctly', async () => {
      clientArgs.services.caseService.getCases.mockResolvedValue({
        saved_objects: [
          caseSO,
          {
            id: '1',
            type: 'cases',
            error: {
              error: 'My error',
              message: 'not found',
              statusCode: 404,
            },
            references: [],
          },
        ],
      });

      const res = await bulkGet({ ids: ['my-case-1'] }, clientArgs);

      expect(res.cases.length).toBe(1);
      expect(res.errors.length).toBe(1);

      expect(res.errors[0]).toEqual({
        caseId: '1',
        error: 'My error',
        message: 'not found',
        status: 404,
      });
    });

    it('constructs the case error correctly in case of an SO decorated error', async () => {
      clientArgs.services.caseService.getCases.mockResolvedValue({
        saved_objects: [
          caseSO,
          {
            id: '1',
            type: 'cases',
            // @ts-expect-error: the error property of the SO client is not typed correctly
            error: {
              ...Boom.boomify(new Error('My error'), {
                statusCode: 404,
                message: 'SO not found',
              }),
            },
            references: [],
          },
        ],
      });

      const res = await bulkGet({ ids: ['my-case-1'] }, clientArgs);

      expect(res.cases.length).toBe(1);
      expect(res.errors.length).toBe(1);

      expect(res.errors[0]).toEqual({
        caseId: '1',
        error: 'Not Found',
        message: 'SO not found: My error',
        status: 404,
      });
    });
  });
});
