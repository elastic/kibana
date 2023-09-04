/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONNECTORS_INDEX } from '../..';

import { fetchConnectorById, fetchConnectorByIndexName, fetchConnectors } from './fetch_connectors';

const indexNotFoundError = {
  meta: {
    body: {
      error: {
        type: 'index_not_found_exception',
      },
    },
  },
};

const otherError = {
  meta: {
    body: {
      error: {
        type: 'other_error',
      },
    },
  },
};

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
    it('should return undefined on index not found error', async () => {
      mockClient.asCurrentUser.get.mockImplementationOnce(() => Promise.reject(indexNotFoundError));
      await expect(fetchConnectorById(mockClient as any, 'id')).resolves.toEqual(undefined);
      expect(mockClient.asCurrentUser.get).toHaveBeenCalledWith({
        id: 'id',
        index: CONNECTORS_INDEX,
      });
    });
    it('should throw on other errors', async () => {
      mockClient.asCurrentUser.get.mockImplementationOnce(() => Promise.reject(otherError));
      await expect(fetchConnectorById(mockClient as any, 'id')).rejects.toEqual(otherError);
      expect(mockClient.asCurrentUser.get).toHaveBeenCalledWith({
        id: 'id',
        index: CONNECTORS_INDEX,
      });
    });
  });
  describe('fetch connector by name', () => {
    it('should fetch connector by index name', async () => {
      mockClient.asCurrentUser.search.mockImplementationOnce(() =>
        Promise.resolve({ hits: { hits: [{ _id: 'connectorId', _source: { source: 'source' } }] } })
      );
      mockClient.asCurrentUser.get.mockImplementationOnce(() =>
        Promise.resolve({ _id: 'connectorId', _source: { source: 'source' } })
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
    it('should return undefined on index not found error', async () => {
      mockClient.asCurrentUser.search.mockImplementationOnce(() =>
        Promise.reject(indexNotFoundError)
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
    });
    it('should throw on other errors', async () => {
      mockClient.asCurrentUser.search.mockImplementationOnce(() => Promise.reject(otherError));
      await expect(fetchConnectorByIndexName(mockClient as any, 'id')).rejects.toEqual(otherError);
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        index: CONNECTORS_INDEX,
        query: {
          term: {
            ['index_name']: 'id',
          },
        },
      });
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
    it('should return empty array on index not found error', async () => {
      mockClient.asCurrentUser.search.mockImplementationOnce(() =>
        Promise.reject(indexNotFoundError)
      );
      await expect(fetchConnectors(mockClient as any)).resolves.toEqual([]);
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        from: 0,
        index: CONNECTORS_INDEX,
        query: { match_all: {} },
        size: 1000,
      });
    });
    it('should throw on other errors', async () => {
      mockClient.asCurrentUser.search.mockImplementationOnce(() => Promise.reject(otherError));
      await expect(fetchConnectors(mockClient as any)).rejects.toEqual(otherError);
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        from: 0,
        index: CONNECTORS_INDEX,
        query: { match_all: {} },
        size: 1000,
      });
    });
  });
});
