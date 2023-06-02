/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupConnectorsIndices } from '../../index_management/setup_indices';

import { fetchSyncJobsByConnectorId } from './fetch_sync_jobs';

jest.mock('../../index_management/setup_indices', () => ({
  setupConnectorsIndices: jest.fn(),
}));

describe('fetchSyncJobs lib', () => {
  const mockClient = {
    asCurrentUser: {
      get: jest.fn(),
      search: jest.fn(),
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('fetch sync jobs by connector id', () => {
    it('should fetch sync jobs by connector id', async () => {
      mockClient.asCurrentUser.search.mockImplementationOnce(() =>
        Promise.resolve({ hits: { hits: ['result1', 'result2'] }, total: 2 })
      );
      await expect(fetchSyncJobsByConnectorId(mockClient as any, 'id', 0, 10)).resolves.toEqual({
        _meta: {
          page: {
            from: 0,
            has_more_hits_than_total: false,
            size: 10,
            total: 0,
          },
        },
        data: [],
      });
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        from: 0,
        index: '.elastic-connectors-sync-jobs',
        query: {
          term: {
            'connector.id': 'id',
          },
        },
        size: 10,
        sort: {
          created_at: {
            order: 'desc',
          },
        },
      });
    });
    it('should return empty result if size is 0', async () => {
      await expect(fetchSyncJobsByConnectorId(mockClient as any, 'id', 0, 0)).resolves.toEqual({
        _meta: {
          page: {
            from: 0,
            has_more_hits_than_total: false,
            size: 10,
            total: 0,
          },
        },
        data: [],
      });
      expect(mockClient.asCurrentUser.search).not.toHaveBeenCalled();
    });
    it('should call setup connectors on index not found error', async () => {
      mockClient.asCurrentUser.search.mockImplementationOnce(() =>
        Promise.reject({
          meta: {
            body: {
              error: {
                type: 'index_not_found_exception',
              },
            },
          },
        })
      );
      await expect(fetchSyncJobsByConnectorId(mockClient as any, 'id', 0, 10)).resolves.toEqual({
        _meta: {
          page: {
            from: 0,
            has_more_hits_than_total: false,
            size: 10,
            total: 0,
          },
        },
        data: [],
      });
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        from: 0,
        index: '.elastic-connectors-sync-jobs',
        query: {
          term: {
            'connector.id': 'id',
          },
        },
        size: 10,
        sort: {
          created_at: {
            order: 'desc',
          },
        },
      });
      expect(setupConnectorsIndices as jest.Mock).toHaveBeenCalledWith(mockClient.asCurrentUser);
    });
    it('should not call setup connectors on other errors', async () => {
      mockClient.asCurrentUser.search.mockImplementationOnce(() =>
        Promise.reject({
          meta: {
            body: {
              error: {
                type: 'other error',
              },
            },
          },
        })
      );
      await expect(fetchSyncJobsByConnectorId(mockClient as any, 'id', 0, 10)).rejects.toEqual({
        meta: {
          body: {
            error: {
              type: 'other error',
            },
          },
        },
      });
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        from: 0,
        index: '.elastic-connectors-sync-jobs',
        query: {
          term: {
            'connector.id': 'id',
          },
        },
        size: 10,
        sort: {
          created_at: {
            order: 'desc',
          },
        },
      });
      expect(setupConnectorsIndices as jest.Mock).not.toHaveBeenCalled();
    });
  });
});
