/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request, ResponseToolkit } from 'hapi';
import { DEFAULT_REPOSITORY_TYPES, REPOSITORY_PLUGINS_MAP } from '../../../common/constants';
import {
  createHandler,
  getAllHandler,
  getOneHandler,
  getTypesHandler,
  updateHandler,
} from './repositories';

describe('[Snapshot and Restore API Routes] Repositories', () => {
  const mockRequest = {} as Request;
  const mockResponseToolkit = {} as ResponseToolkit;

  describe('getAllHandler()', () => {
    it('should arrify repositories returned from ES', async () => {
      const mockEsResponse = {
        fooRepository: {},
        barRepository: {},
      };
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockEsResponse)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});
      const expectedResponse = {
        repositories: [{ name: 'fooRepository' }, { name: 'barRepository' }],
        verification: {
          fooRepository: { valid: true, response: {} },
          barRepository: { valid: true, response: {} },
        },
      };
      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return empty array if no repositories returned from ES', async () => {
      const mockEsResponse = {};
      const mockEsVerificationResponse = {};
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockEsResponse)
        .mockResolvedValueOnce(mockEsVerificationResponse);
      const expectedResponse = {
        repositories: [],
        verification: {},
      };
      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return failed verification from ES', async () => {
      const mockEsResponse = {
        fooRepository: {},
        barRepository: {},
      };
      const verificationError = new Error('failed verification');
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockEsResponse)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(verificationError);
      const expectedResponse = {
        repositories: [{ name: 'fooRepository' }, { name: 'barRepository' }],
        verification: {
          fooRepository: { valid: true, response: {} },
          barRepository: { valid: false, error: verificationError },
        },
      };
      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
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
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockEsResponse)
        .mockResolvedValueOnce({});
      const expectedResponse = {
        repository: { name, ...mockEsResponse[name] },
        verification: { valid: true, response: {} },
      };
      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return empty repository object if not returned from ES', async () => {
      const mockEsResponse = {};
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockEsResponse)
        .mockResolvedValueOnce({});
      const expectedResponse = {
        repository: {},
        verification: {},
      };
      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return failed verification from ES', async () => {
      const mockEsResponse = {
        [name]: { abc: 123 },
      };
      const verificationError = new Error('failed verification');
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockEsResponse)
        .mockRejectedValueOnce(verificationError);
      const expectedResponse = {
        repository: { name, ...mockEsResponse[name] },
        verification: { valid: false, error: verificationError },
      };
      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('getTypesHandler()', () => {
    it('should return default types if no repository plugins returned from ES', async () => {
      const mockEsResponse = {};
      const callWithRequest = jest.fn().mockReturnValue(mockEsResponse);
      const expectedResponse = [...DEFAULT_REPOSITORY_TYPES];
      await expect(
        getTypesHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return default types with any repository plugins returned from ES', async () => {
      const pluginNames = Object.keys(REPOSITORY_PLUGINS_MAP);
      const pluginTypes = Object.entries(REPOSITORY_PLUGINS_MAP).map(([key, value]) => value);
      const mockEsResponse = [...pluginNames.map(key => ({ component: key }))];
      const callWithRequest = jest.fn().mockReturnValue(mockEsResponse);
      const expectedResponse = [...DEFAULT_REPOSITORY_TYPES, ...pluginTypes];
      await expect(
        getTypesHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should not return non-repository plugins returned from ES', async () => {
      const pluginNames = ['foo-plugin', 'bar-plugin'];
      const mockEsResponse = [...pluginNames.map(key => ({ component: key }))];
      const callWithRequest = jest.fn().mockReturnValue(mockEsResponse);
      const expectedResponse = [...DEFAULT_REPOSITORY_TYPES];
      await expect(
        getTypesHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        getOneHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('createHandler()', () => {
    const name = 'fooRepository';
    const mockCreateRequest = ({
      payload: {
        name,
      },
    } as unknown) as Request;

    it('should return successful ES response', async () => {
      const mockEsResponse = { acknowledged: true };
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce({})
        .mockReturnValueOnce(mockEsResponse);
      const expectedResponse = { ...mockEsResponse };
      await expect(
        createHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return error if repository with the same name already exists', async () => {
      const mockEsResponse = { [name]: {} };
      const callWithRequest = jest.fn().mockReturnValue(mockEsResponse);
      await expect(
        createHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        createHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('updateHandler()', () => {
    const name = 'fooRepository';
    const mockCreateRequest = ({
      params: {
        name,
      },
      payload: {
        name,
      },
    } as unknown) as Request;

    it('should return successful ES response', async () => {
      const mockEsResponse = { acknowledged: true };
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce({ [name]: {} })
        .mockReturnValueOnce(mockEsResponse);
      const expectedResponse = { ...mockEsResponse };
      await expect(
        updateHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        updateHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });
});
