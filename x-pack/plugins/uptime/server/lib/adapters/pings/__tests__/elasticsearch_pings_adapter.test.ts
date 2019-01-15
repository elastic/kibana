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
  let mockEsSearchResult: any;
  let mockEsCountResult: any;

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
    mockEsSearchResult = {
      hits: {
        total: {
          value: mockHits.length,
        },
        hits: mockHits,
      },
    };
    mockEsCountResult = {
      count: mockHits.length,
    };
    database = {
      search: async (request: any, params: any) => mockEsSearchResult,
      count: async (request: any, params: any) => mockEsCountResult,
    };
    adapter = new ElasticsearchPingsAdapter(database);
    serverRequest = {
      requestArgs: 'hello',
    };
  });

  describe('getDocCount', () => {
    it('returns data in appropriate shape', async () => {
      const { count } = await adapter.getDocCount(serverRequest);
      expect(count).toEqual(3);
    });
  });

  describe('getAll', () => {
    let getAllSearchMock: (request: any, params: any) => Promise<any>;
    let expectedGetAllParams: any;
    beforeEach(() => {
      getAllSearchMock = jest.fn(async (request: any, params: any) => mockEsSearchResult);
      expectedGetAllParams = {
        index: 'heartbeat*',
        body: {
          query: {
            bool: {
              filter: [{ range: { '@timestamp': { gte: 100, lte: 200 } } }],
              must: [],
            },
          },
          sort: [{ '@timestamp': { order: 'asc' } }],
          size: 12,
        },
      };
    });

    it('returns data in the appropriate shape', async () => {
      const result = await adapter.getAll(serverRequest, 100, 200, undefined, undefined, 'asc', 12);
      const count = 3;

      expect(result.total).toBe(count);

      const pings = result.pings!;
      expect(pings).toHaveLength(count);
      expect(pings[0].timestamp).toBe('2018-10-30T18:51:59.792Z');
      expect(pings[1].timestamp).toBe('2018-10-30T18:53:59.792Z');
      expect(pings[2].timestamp).toBe('2018-10-30T18:55:59.792Z');
    });

    it('creates appropriate sort and size parameters', async () => {
      database.search = getAllSearchMock;

      await adapter.getAll(serverRequest, 100, 200, undefined, undefined, 'asc', 12);

      expect(database.search).toHaveBeenCalledTimes(1);
      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedGetAllParams);
    });

    it('omits the sort param when no sort passed', async () => {
      database.search = getAllSearchMock;
      await adapter.getAll(serverRequest, 100, 200, undefined, undefined, undefined, 12);
      delete expectedGetAllParams.body.sort;
      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedGetAllParams);
    });

    it('omits the size param when no size passed', async () => {
      database.search = getAllSearchMock;
      await adapter.getAll(serverRequest, 100, 200, undefined, undefined, 'desc');
      delete expectedGetAllParams.body.size;
      set(expectedGetAllParams, 'body.sort[0].@timestamp.order', 'desc');
      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedGetAllParams);
    });

    it('adds a filter for monitor ID', async () => {
      database.search = getAllSearchMock;
      await adapter.getAll(serverRequest, 100, 200, 'testmonitorid');
      delete expectedGetAllParams.body.size;
      delete expectedGetAllParams.body.sort;
      expectedGetAllParams.body.query.bool.must.push({ term: { 'monitor.id': 'testmonitorid' } });
      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedGetAllParams);
    });

    it('adds a filter for monitor status', async () => {
      database.search = getAllSearchMock;
      await adapter.getAll(serverRequest, 100, 200, undefined, 'down');
      delete expectedGetAllParams.body.size;
      delete expectedGetAllParams.body.sort;
      expectedGetAllParams.body.query.bool.must.push({ term: { 'monitor.status': 'down' } });
      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedGetAllParams);
    });
  });

  describe('getLatestMonitorDocs', () => {
    let getLatestSearchMock: (request: any, params: any) => Promise<any>;
    let expectedGetLatestSearchParams: any;
    beforeEach(() => {
      getLatestSearchMock = jest.fn(async (request: any, params: any) => mockEsSearchResult);
      expectedGetLatestSearchParams = {
        index: 'heartbeat*',
        body: {
          query: {
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: 100,
                      lte: 200,
                    },
                  },
                },
              ],
              must: [
                {
                  term: { 'monitor.id': 'testmonitor' },
                },
              ],
            },
          },
          aggs: {
            by_id: {
              terms: {
                field: 'monitor.id',
              },
              aggs: {
                latest: {
                  top_hits: {
                    size: 1,
                  },
                },
              },
            },
          },
        },
      };
      mockEsSearchResult = {
        aggregations: {
          by_id: {
            buckets: [
              {
                latest: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          '@timestamp': 123456,
                          monitor: {
                            id: 'testmonitor',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      };
    });

    it('returns data in expected shape', async () => {
      database.search = getLatestSearchMock;
      const result = await adapter.getLatestMonitorDocs(serverRequest, 100, 200, 'testmonitor');
      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toBe(123456);
      expect(result[0].monitor).not.toBeFalsy();
      // @ts-ignore monitor will be defined
      expect(result[0].monitor.id).toBe('testmonitor');
      expect(database.search).toHaveBeenCalledWith(serverRequest, expectedGetLatestSearchParams);
    });
  });
});
