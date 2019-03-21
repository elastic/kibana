/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseToolkit } from 'hapi';
import { getAllHandler, getOneHandler } from './repositories';

describe('[Snapshot and Restore API Routes] Repositories', () => {
  const mockRequest = {} as Request;
  const mockResponseToolkit = {} as ResponseToolkit;

  describe('getAllHandler()', () => {
    it('should arrify repositories returned from ES', async () => {
      const mockEsResponse = {
        fooRepository: {},
        barRepository: {},
      };
      const callWithRequest = jest.fn().mockReturnValue(mockEsResponse);
      const expectedResponse = [{ name: 'fooRepository' }, { name: 'barRepository' }];
      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return empty array if no repositories returned from ES', async () => {
      const mockEsResponse = {};
      const callWithRequest = jest.fn().mockReturnValue(mockEsResponse);
      const expectedResponse: any[] = [];
      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockImplementation(() => {
        throw new Error();
      });
      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('getOneHandler()', () => {
    const name = 'fooRepository';
    const mockOneRequest = ({
      params: {
        name,
      },
    } as unknown) as Request;

    it('should return repository object if returned from ES', async () => {
      const mockEsResponse = {
        [name]: { abc: 123 },
      };
      const callWithRequest = jest.fn().mockReturnValue(mockEsResponse);
      const expectedResponse = { name, ...mockEsResponse[name] };
      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return empty repository object if not returned from ES', async () => {
      const mockEsResponse = {};
      const callWithRequest = jest.fn().mockReturnValue(mockEsResponse);
      const expectedResponse = {};
      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockImplementation(() => {
        throw new Error();
      });
      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });
});
