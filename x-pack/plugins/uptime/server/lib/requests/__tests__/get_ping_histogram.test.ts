/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPingHistogram } from '../get_ping_histogram';
import * as intervalHelper from '../../helper/get_histogram_interval';
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
              doc_count: 2,
            },
            down: {
              doc_count: 1,
            },
          },
          {
            key: 2,
            up: {
              doc_count: 2,
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
                  doc_count: 2,
                },
                down: {
                  doc_count: 1,
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
      from: 'now-15m',
      to: 'now',
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
      from: 'now-15m',
      to: 'now',
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
                  doc_count: 2,
                },
                down: {
                  doc_count: 1,
                },
              },
              {
                key: 2,
                up: {
                  doc_count: 2,
                },
                down: {
                  doc_count: 2,
                },
              },
              {
                key: 3,
                up: {
                  doc_count: 3,
                },
                down: {
                  doc_count: 1,
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
      from: 'now-15m',
      to: 'now',
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
                  doc_count: 2,
                },
                down: {
                  doc_count: 1,
                },
              },
              {
                key: 2,
                up: {
                  doc_count: 1,
                },
                down: {
                  doc_count: 2,
                },
              },
              {
                key: 3,
                up: {
                  doc_count: 3,
                },
                down: {
                  doc_count: 1,
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
      from: 'now-15m',
      to: 'now',
      filters,
    });

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(result).toMatchSnapshot();
  });
});
