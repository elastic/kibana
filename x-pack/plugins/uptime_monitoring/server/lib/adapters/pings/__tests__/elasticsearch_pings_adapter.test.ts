/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import { DatabaseAdapter } from '../../database';
import { ElasticsearchPingsAdapter } from '../elasticsearch_pings_adapter';

describe('ElasticsearchPingsAdapter class', () => {
  let database: DatabaseAdapter;
  let adapter: ElasticsearchPingsAdapter;
  let serverRequest: any;
  let mockHits: any[];
  let mockEsResult: any;

  beforeEach(() => {
    mockHits = [
      {
        _source: {
          '@timestamp': '2018-10-30T18:51:59.792Z',
        },
      },
      {
        _source: {
          '@timestamp': '2018-10-30T18:53:59.792Z',
        },
      },
      {
        _source: {
          '@timestamp': '2018-10-30T18:55:59.792Z',
        },
      },
    ];
    mockEsResult = {
      hits: {
        hits: mockHits,
      },
    };
    database = {
      search: async (request: any, params: any) => mockEsResult,
    };
    adapter = new ElasticsearchPingsAdapter(database);
    serverRequest = {
      requestArgs: 'hello',
    };
  });

  describe('getAll', () => {
    let getAllSearchMock: (request: any, params: any) => Promise<any>;
    let expectedEsParams: any;
    beforeEach(() => {
      getAllSearchMock = jest.fn(async (request: any, params: any) => mockEsResult);
      expectedEsParams = {
        index: 'heartbeat*',
        body: {
          query: {
            match_all: {},
          },
          sort: [{ '@timestamp': { order: 'asc' } }],
          size: 12,
        },
      };
    });

    it('returns data in the appropriate shape', async () => {
      const result = await adapter.getAll(serverRequest, 'asc', 12);

      expect(result).toHaveLength(3);
      expect(result[0].timestamp).toBe('2018-10-30T18:51:59.792Z');
      expect(result[1].timestamp).toBe('2018-10-30T18:53:59.792Z');
      expect(result[2].timestamp).toBe('2018-10-30T18:55:59.792Z');
    });

    it('creates appropriate sort and size parameters', async () => {
      database.search = getAllSearchMock;
      await adapter.getAll(serverRequest, 'asc', 12);

      expect(database.search).toHaveBeenCalledTimes(1);
      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedEsParams);
    });

    it('omits the sort param when no sort passed', async () => {
      database.search = getAllSearchMock;
      await adapter.getAll(serverRequest, undefined, 12);
      delete expectedEsParams.body.sort;
      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedEsParams);
    });

    it('omits the size param when no size passed', async () => {
      database.search = getAllSearchMock;
      await adapter.getAll(serverRequest, 'desc', undefined);
      delete expectedEsParams.body.size;
      set(expectedEsParams, 'body.sort[0].@timestamp.order', 'desc');
      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedEsParams);
    });
  });
});
