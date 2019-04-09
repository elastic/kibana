/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseToolkit } from 'hapi';
import { getAllHandler, getOneHandler } from './snapshots';

describe('[Snapshot and Restore API Routes] Snapshots', () => {
  const mockResponseToolkit = {} as ResponseToolkit;

  describe('getAllHandler()', () => {
    const mockRequest = {} as Request;

    test('combines snapshots and their repositories returned from ES', async () => {
      const mockSnapshotGetRepositoryEsResponse = {
        fooRepository: {},
        barRepository: {},
      };

      const mockCatSnapshotsFooResponse = Promise.resolve([
        {
          id: 'snapshot1',
        },
      ]);

      const mockCatSnapshotsBarResponse = Promise.resolve([
        {
          id: 'snapshot2',
        },
      ]);

      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockSnapshotGetRepositoryEsResponse)
        .mockReturnValueOnce(mockCatSnapshotsFooResponse)
        .mockReturnValueOnce(mockCatSnapshotsBarResponse);

      const expectedResponse = {
        errors: [],
        snapshots: [
          { repositories: ['fooRepository'], id: 'snapshot1', summary: {} },
          { repositories: ['barRepository'], id: 'snapshot2', summary: {} },
        ],
      };

      const response = await getAllHandler(mockRequest, callWithRequest, mockResponseToolkit);
      expect(response).toEqual(expectedResponse);
    });

    test('returns empty arrays if no snapshots returned from ES', async () => {
      const mockSnapshotGetRepositoryEsResponse = {};
      const callWithRequest = jest.fn().mockReturnValue(mockSnapshotGetRepositoryEsResponse);
      const expectedResponse = { errors: [], snapshots: [] };

      const response = await getAllHandler(mockRequest, callWithRequest, mockResponseToolkit);
      expect(response).toEqual(expectedResponse);
    });

    test('throws if ES error', async () => {
      const callWithRequest = jest.fn().mockImplementation(() => {
        throw new Error();
      });

      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('getOneHandler()', () => {
    const repository = 'fooRepository';
    const snapshot = 'snapshot1';

    const mockOneRequest = ({
      params: {
        repository,
        snapshot,
      },
    } as unknown) as Request;

    test('returns snapshot object with repository name if returned from ES', async () => {
      const mockSnapshotGetEsResponse = {
        snapshots: [{ snapshot }],
      };
      const callWithRequest = jest.fn().mockReturnValue(mockSnapshotGetEsResponse);
      const expectedResponse = { snapshot };

      const response = await getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit);
      expect(response).toEqual(expectedResponse);
    });

    test('throws if ES error (including 404s)', async () => {
      const callWithRequest = jest.fn().mockImplementation(() => {
        throw new Error();
      });

      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });
});
