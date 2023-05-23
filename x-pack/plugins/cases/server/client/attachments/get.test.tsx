/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMockArgs } from '../mocks';
import { find as findComment } from './get';

describe('get', () => {
  describe('findComment', () => {
    const clientArgs = createCasesClientMockArgs();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('Invalid fields result in error', async () => {
      expect(() =>
        // @ts-expect-error
        findComment({ caseID: 'mock-id', foo: 'bar' }, clientArgs)
      ).rejects.toThrow('excess properties: ["foo"]');
    });

    it('Invalid total items results in error', async () => {
      await expect(() =>
        findComment({ caseID: 'mock-id', queryParams: { page: 2, perPage: 9001 } }, clientArgs)
      ).rejects.toThrow(
        'The number of documents is too high. Paginating through more than 10,000 documents is not possible.'
      );
    });
  });
});
