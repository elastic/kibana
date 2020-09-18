/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPingHistogram } from '../get_ping_histogram';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../common/constants';

describe('getPingHistogram', () => {
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
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue({
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
    });

    const result = await getPingHistogram({
      callES: mockEsClient,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
      from: 'now-15m',
      to: 'now',
    });

    expect(mockEsClient).toHaveBeenCalledTimes(1);
    expect(result).toMatchSnapshot();
  });

  it('returns expected result for no status filter', async () => {
    expect.assertions(2);
    const mockEsClient = jest.fn();

    standardMockResponse.aggregations.timeseries.interval = '1m';
    mockEsClient.mockReturnValue(standardMockResponse);

    const result = await getPingHistogram({
      callES: mockEsClient,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
      from: 'now-15m',
      to: 'now',
      filters: '',
    });

    expect(mockEsClient).toHaveBeenCalledTimes(1);
    expect(result).toMatchSnapshot();
  });

  it('handles status + additional user queries', async () => {
    expect.assertions(2);
    const mockEsClient = jest.fn();

    mockEsClient.mockReturnValue({
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
    });

    const searchFilter = {
      bool: {
        must: [
          { match: { 'monitor.id': { query: 'auto-http-0X89BB0F9A6C81D178', operator: 'and' } } },
          { match: { 'monitor.name': { query: 'my-new-test-site-name', operator: 'and' } } },
        ],
      },
    };

    const result = await getPingHistogram({
      callES: mockEsClient,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
      from: '1234',
      to: '5678',
      filters: JSON.stringify(searchFilter),
      monitorId: undefined,
    });

    expect(mockEsClient).toHaveBeenCalledTimes(1);
    expect(result).toMatchSnapshot();
  });

  it('handles simple_text_query without issues', async () => {
    expect.assertions(2);
    const mockEsClient = jest.fn();

    mockEsClient.mockReturnValue({
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
    });

    const filters = `{"bool":{"must":[{"simple_query_string":{"query":"http"}}]}}`;
    const result = await getPingHistogram({
      callES: mockEsClient,
      dynamicSettings: DYNAMIC_SETTINGS_DEFAULTS,
      from: 'now-15m',
      to: 'now',
      filters,
    });

    expect(mockEsClient).toHaveBeenCalledTimes(1);
    expect(result).toMatchSnapshot();
  });
});
