/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPings } from '../get_pings';
import { set } from 'lodash';

describe('getAll', () => {
  let mockEsSearchResult: any;
  let mockHits: any;
  let expectedGetAllParams: any;
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
      aggregations: {
        locations: {
          buckets: [{ key: 'foo' }],
        },
      },
    };
    expectedGetAllParams = {
      index: 'heartbeat-8*',
      body: {
        query: {
          bool: {
            filter: [{ range: { '@timestamp': { gte: 'now-1h', lte: 'now' } } }],
          },
        },
        aggregations: {
          locations: {
            terms: {
              field: 'observer.geo.name',
              missing: 'N/A',
              size: 1000,
            },
          },
        },
        sort: [{ '@timestamp': { order: 'desc' } }],
        size: 12,
      },
    };
  });

  it('returns data in the appropriate shape', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue(mockEsSearchResult);
    const result = await getPings({
      callES: mockEsClient,
      dateRangeStart: 'now-1h',
      dateRangeEnd: 'now',
      sort: 'asc',
      size: 12,
    });
    const count = 3;

    expect(result.total).toBe(count);

    const pings = result.pings!;
    expect(pings).toHaveLength(count);
    expect(pings[0].timestamp).toBe('2018-10-30T18:51:59.792Z');
    expect(pings[1].timestamp).toBe('2018-10-30T18:53:59.792Z');
    expect(pings[2].timestamp).toBe('2018-10-30T18:55:59.792Z');
    expect(mockEsClient).toHaveBeenCalledTimes(1);
  });

  it('creates appropriate sort and size parameters', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue(mockEsSearchResult);
    await getPings({
      callES: mockEsClient,
      dateRangeStart: 'now-1h',
      dateRangeEnd: 'now',
      sort: 'asc',
      size: 12,
    });
    set(expectedGetAllParams, 'body.sort[0]', { '@timestamp': { order: 'asc' } });

    expect(mockEsClient).toHaveBeenCalledTimes(1);
    expect(mockEsClient).toHaveBeenCalledWith('search', expectedGetAllParams);
  });

  it('omits the sort param when no sort passed', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue(mockEsSearchResult);
    await getPings({
      callES: mockEsClient,
      dateRangeStart: 'now-1h',
      dateRangeEnd: 'now',
      size: 12,
    });

    expect(mockEsClient).toHaveBeenCalledWith('search', expectedGetAllParams);
  });

  it('omits the size param when no size passed', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue(mockEsSearchResult);
    await getPings({
      callES: mockEsClient,
      dateRangeStart: 'now-1h',
      dateRangeEnd: 'now',
      sort: 'desc',
    });
    delete expectedGetAllParams.body.size;
    set(expectedGetAllParams, 'body.sort[0].@timestamp.order', 'desc');

    expect(mockEsClient).toHaveBeenCalledWith('search', expectedGetAllParams);
  });

  it('adds a filter for monitor ID', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue(mockEsSearchResult);
    await getPings({
      callES: mockEsClient,
      dateRangeStart: 'now-1h',
      dateRangeEnd: 'now',
      monitorId: 'testmonitorid',
    });
    delete expectedGetAllParams.body.size;
    expectedGetAllParams.body.query.bool.filter.push({ term: { 'monitor.id': 'testmonitorid' } });

    expect(mockEsClient).toHaveBeenCalledWith('search', expectedGetAllParams);
  });

  it('adds a filter for monitor status', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue(mockEsSearchResult);
    await getPings({
      callES: mockEsClient,
      dateRangeStart: 'now-1h',
      dateRangeEnd: 'now',
      status: 'down',
    });
    delete expectedGetAllParams.body.size;
    expectedGetAllParams.body.query.bool.filter.push({ term: { 'monitor.status': 'down' } });

    expect(mockEsClient).toHaveBeenCalledWith('search', expectedGetAllParams);
  });
});
