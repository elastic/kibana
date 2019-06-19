/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request, ResponseToolkit } from 'hapi';
import { createHandler } from './restore';

describe('[Snapshot and Restore API Routes] Restore', () => {
  const mockResponseToolkit = {} as ResponseToolkit;

  describe('createHandler()', () => {
    const mockCreateRequest = ({
      params: {
        repository: 'foo',
        snapshot: 'snapshot-1',
      },
      payload: {},
    } as unknown) as Request;

    it('should return successful response from ES', async () => {
      const mockEsResponse = { acknowledged: true };
      const callWithRequest = jest.fn().mockReturnValueOnce(mockEsResponse);
      await expect(
        createHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(mockEsResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        createHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });
});
