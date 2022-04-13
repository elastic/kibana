/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPingHistogram } from './get_ping_histogram';
import * as intervalHelper from '../../../common/lib/get_histogram_interval';
import { getUptimeESMockClient } from './helper';

describe('getPingHistogram', () => {
  beforeEach(() => {
    jest.spyOn(intervalHelper, 'getHistogramInterval').mockReturnValue(36000);
  });

  const standardMockResponse: any = {
    aggregations: {
      timeseries: {
        buckets: [
          {
            key: 1,
            up: {
              value: 2,
            },
            down: {
              value: 1,
            },
          },
          {
            key: 2,
            up: {
              value: 2,
            },
            down: {
              bucket_count: 1,
            },
          },
        ],
      },
    },
  };

  it('returns a single bucket if array has 1', async () => {
    expect.assertions(2);
    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResolvedValueOnce({
      body: {
        aggregations: {
          timeseries: {
            buckets: [
              {
                key: 1,
                up: {
                  value: 2,
                },
                down: {
                  value: 1,
                },
              },
            ],
            interval: '10s',
          },
        },
      },
    } as any);

    const result = await getPingHistogram({
      uptimeEsClient,
      dateStart: 'now-15m',
      dateEnd: 'now',
    });

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(result).toMatchSnapshot();
  });

  it('returns expected result for no status filter', async () => {
    expect.assertions(2);

    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    standardMockResponse.aggregations.timeseries.interval = '1m';

    mockEsClient.search.mockResolvedValueOnce({
      body: standardMockResponse,
    } as any);

    const result = await getPingHistogram({
      uptimeEsClient,
      dateStart: 'now-15m',
      dateEnd: 'now',
      filters: '',
    });

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(result).toMatchSnapshot();
  });

  it('handles status + additional user queries', async () => {
    expect.assertions(2);

    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResolvedValueOnce({
      body: {
        aggregations: {
          timeseries: {
            buckets: [
              {
                key: 1,
                up: {
                  value: 2,
                },
                down: {
                  value: 1,
                },
              },
              {
                key: 2,
                up: {
                  value: 2,
                },
                down: {
                  value: 2,
                },
              },
              {
                key: 3,
                up: {
                  value: 3,
                },
                down: {
                  value: 1,
                },
              },
            ],
            interval: '1h',
          },
        },
      },
    } as any);

    const searchFilter = {
      bool: {
        must: [
          { match: { 'monitor.id': { query: 'auto-http-0X89BB0F9A6C81D178', operator: 'and' } } },
          { match: { 'monitor.name': { query: 'my-new-test-site-name', operator: 'and' } } },
        ],
      },
    };

    const result = await getPingHistogram({
      uptimeEsClient,
      dateStart: 'now-15m',
      dateEnd: 'now',
      filters: JSON.stringify(searchFilter),
      monitorId: undefined,
    });

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(result).toMatchSnapshot();
  });

  it('handles simple_text_query without issues', async () => {
    expect.assertions(2);
    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResolvedValueOnce({
      body: {
        aggregations: {
          timeseries: {
            buckets: [
              {
                key: 1,
                up: {
                  value: 2,
                },
                down: {
                  value: 1,
                },
              },
              {
                key: 2,
                up: {
                  value: 1,
                },
                down: {
                  value: 2,
                },
              },
              {
                key: 3,
                up: {
                  value: 3,
                },
                down: {
                  value: 1,
                },
              },
            ],
            interval: '1m',
          },
        },
      },
    } as any);

    const filters = `{"bool":{"must":[{"simple_query_string":{"query":"http"}}]}}`;
    const result = await getPingHistogram({
      uptimeEsClient,
      dateStart: 'now-15m',
      dateEnd: 'now',
      filters,
    });

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(result).toMatchSnapshot();
  });

  it('returns an empty array if agg buckets are undefined', async () => {
    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResolvedValueOnce({
      body: {
        aggregations: {
          timeseries: {
            buckets: undefined,
            interval: '1m',
          },
        },
      },
    } as any);

    const result = await getPingHistogram({ uptimeEsClient, dateStart: 'now-15m', dateEnd: 'now' });

    expect(result.histogram).toEqual([]);
  });

  it('returns an empty array if agg buckets are empty', async () => {
    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResolvedValueOnce({
      body: {
        aggregations: {
          timeseries: {
            buckets: [],
            interval: '1m',
          },
        },
      },
    } as any);

    const result = await getPingHistogram({ uptimeEsClient, dateStart: 'now-15m', dateEnd: 'now' });

    expect(result.histogram).toEqual([]);
  });
});
