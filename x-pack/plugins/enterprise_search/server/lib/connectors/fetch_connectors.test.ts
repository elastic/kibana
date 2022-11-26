/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONNECTORS_INDEX } from '../..';
import { setupConnectorsIndices } from '../../index_management/setup_indices';

import { fetchConnectorById, fetchConnectorByIndexName, fetchConnectors } from './fetch_connectors';

jest.mock('../../index_management/setup_indices', () => ({
  setupConnectorsIndices: jest.fn(),
}));

describe('fetchConnectors lib', () => {
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
  describe('fetch connector by id', () => {
    it('should fetch connector by id', async () => {
      mockClient.asCurrentUser.get.mockImplementationOnce(() =>
        Promise.resolve({
          _id: 'connectorId',
          _primary_term: 'primaryTerm',
          _seq_no: 5,
          _source: { source: 'source' },
        })
      );
      await expect(fetchConnectorById(mockClient as any, 'id')).resolves.toEqual({
        primaryTerm: 'primaryTerm',
        seqNo: 5,
        value: { id: 'connectorId', source: 'source' },
      });
      expect(mockClient.asCurrentUser.get).toHaveBeenCalledWith({
        id: 'id',
        index: CONNECTORS_INDEX,
      });
    });
    it('should call setup connectors on index not found error', async () => {
      mockClient.asCurrentUser.get.mockImplementationOnce(() =>
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
      await expect(fetchConnectorById(mockClient as any, 'id')).resolves.toEqual(undefined);
      expect(mockClient.asCurrentUser.get).toHaveBeenCalledWith({
        id: 'id',
        index: CONNECTORS_INDEX,
      });
      expect(setupConnectorsIndices as jest.Mock).toHaveBeenCalledWith(mockClient.asCurrentUser);
    });
    it('should not call setup connectors on other errors', async () => {
      mockClient.asCurrentUser.get.mockImplementationOnce(() =>
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
      await expect(fetchConnectorById(mockClient as any, 'id')).resolves.toEqual(undefined);
      expect(mockClient.asCurrentUser.get).toHaveBeenCalledWith({
        id: 'id',
        index: CONNECTORS_INDEX,
      });
      expect(setupConnectorsIndices as jest.Mock).not.toHaveBeenCalled();
    });
  });
  describe('fetch connector by name', () => {
    it('should fetch connector by index name', async () => {
      mockClient.asCurrentUser.search.mockImplementationOnce(() =>
        Promise.resolve({ hits: { hits: [{ _id: 'connectorId', _source: { source: 'source' } }] } })
      );
      await expect(fetchConnectorByIndexName(mockClient as any, 'id')).resolves.toEqual({
        id: 'connectorId',
        source: 'source',
      });
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        index: CONNECTORS_INDEX,
        query: {
          term: {
            ['index_name']: 'id',
          },
        },
      });
    });
    it('should call setup connectors on index not found error', async () => {
      mockClient.asCurrentUser.search.mockImplementationOnce(() =>
        Promise.reject({
          meta: {
            body: {
              error: { type: 'index_not_found_exception' },
            },
          },
        })
      );
      await expect(fetchConnectorByIndexName(mockClient as any, 'id')).resolves.toEqual(undefined);
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        index: CONNECTORS_INDEX,
        query: {
          term: {
            ['index_name']: 'id',
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
      await expect(fetchConnectorByIndexName(mockClient as any, 'id')).resolves.toEqual(undefined);
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        index: CONNECTORS_INDEX,
        query: {
          term: {
            ['index_name']: 'id',
          },
        },
      });
      expect(setupConnectorsIndices as jest.Mock).not.toHaveBeenCalled();
    });
  });
  describe('fetch connectors', () => {
    it('should fetch connectors', async () => {
      mockClient.asCurrentUser.search.mockImplementationOnce(() =>
        Promise.resolve({ hits: { hits: [{ _id: 'connectorId', _source: { source: 'source' } }] } })
      );
      await expect(fetchConnectors(mockClient as any)).resolves.toEqual([
        {
          id: 'connectorId',
          source: 'source',
        },
      ]);
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        from: 0,
        index: CONNECTORS_INDEX,
        query: { match_all: {} },
        size: 1000,
      });
    });
    it('should fetch all connectors if there are more than 1000', async () => {
      const hits = [...Array(1000).keys()].map((key) => ({
        _id: key,
        _source: { source: 'source' },
      }));
      const resultHits = hits.map((hit) => ({ ...hit._source, id: hit._id }));

      let count = 0;

      mockClient.asCurrentUser.search.mockImplementation(() => {
        count += 1;
        if (count === 3) {
          return Promise.resolve({ hits: { hits: [] } });
        }
        return Promise.resolve({ hits: { hits } });
      });
      await expect(fetchConnectors(mockClient as any)).resolves.toEqual([
        ...resultHits,
        ...resultHits,
      ]);
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        from: 0,
        index: CONNECTORS_INDEX,
        query: { match_all: {} },
        size: 1000,
      });
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledTimes(3);
    });
    it('should call setup connectors on index not found error', async () => {
      mockClient.asCurrentUser.search.mockImplementationOnce(() =>
        Promise.reject({
          meta: {
            body: {
              error: { type: 'index_not_found_exception' },
            },
          },
        })
      );
      await expect(fetchConnectors(mockClient as any)).resolves.toEqual([]);
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        from: 0,
        index: CONNECTORS_INDEX,
        query: { match_all: {} },
        size: 1000,
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
      await expect(fetchConnectors(mockClient as any)).resolves.toEqual([]);
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        from: 0,
        index: CONNECTORS_INDEX,
        query: { match_all: {} },
        size: 1000,
      });
      expect(setupConnectorsIndices as jest.Mock).not.toHaveBeenCalled();
    });
  });
});
