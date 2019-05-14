/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseToolkit } from 'hapi';
import { getAllHandler, getOneHandler } from './snapshots';

const defaultSnapshot = {
  repository: undefined,
  snapshot: undefined,
  uuid: undefined,
  versionId: undefined,
  version: undefined,
  indices: [],
  includeGlobalState: 0,
  state: undefined,
  startTime: undefined,
  startTimeInMillis: undefined,
  endTime: undefined,
  endTimeInMillis: undefined,
  durationInMillis: undefined,
  indexFailures: [],
  shards: undefined,
};

describe('[Snapshot and Restore API Routes] Snapshots', () => {
  const mockResponseToolkit = {} as ResponseToolkit;

  describe('getAllHandler()', () => {
    const mockRequest = {} as Request;

    test('combines snapshots and their repositories returned from ES', async () => {
      const mockSnapshotGetRepositoryEsResponse = {
        fooRepository: {},
        barRepository: {},
      };

      const mockGetSnapshotsFooResponse = Promise.resolve({
        snapshots: [
          {
            snapshot: 'snapshot1',
          },
        ],
      });

      const mockGetSnapshotsBarResponse = Promise.resolve({
        snapshots: [
          {
            snapshot: 'snapshot2',
          },
        ],
      });

      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockSnapshotGetRepositoryEsResponse)
        .mockReturnValueOnce(mockGetSnapshotsFooResponse)
        .mockReturnValueOnce(mockGetSnapshotsBarResponse);

      const expectedResponse = {
        errors: {},
        repositories: ['fooRepository', 'barRepository'],
        snapshots: [
          { ...defaultSnapshot, repository: 'fooRepository', snapshot: 'snapshot1' },
          { ...defaultSnapshot, repository: 'barRepository', snapshot: 'snapshot2' },
        ],
      };

      const response = await getAllHandler(mockRequest, callWithRequest, mockResponseToolkit);
      expect(response).toEqual(expectedResponse);
    });

    test('returns empty arrays if no snapshots returned from ES', async () => {
      const mockSnapshotGetRepositoryEsResponse = {};
      const callWithRequest = jest.fn().mockReturnValue(mockSnapshotGetRepositoryEsResponse);
      const expectedResponse = { errors: [], snapshots: [], repositories: [] };

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
      const expectedResponse = {
        ...defaultSnapshot,
        snapshot,
        repository,
      };

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
