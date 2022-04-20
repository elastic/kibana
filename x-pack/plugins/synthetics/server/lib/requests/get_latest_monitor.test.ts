/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestMonitor } from './get_latest_monitor';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants';
import { getUptimeESMockClient } from './helper';

describe('getLatestMonitor', () => {
  let expectedGetLatestSearchParams: any;
  let mockEsSearchResult: any;
  beforeEach(() => {
    expectedGetLatestSearchParams = {
      index: DYNAMIC_SETTINGS_DEFAULTS.heartbeatIndices,
      body: {
        query: {
          bool: {
            filter: [
              {
                exists: {
                  field: 'summary',
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: 'now-1h',
                    lte: 'now',
                  },
                },
              },
              {
                term: { 'monitor.id': 'testMonitor' },
              },
            ],
          },
        },
        size: 1,
        _source: ['url', 'monitor', 'observer', '@timestamp', 'tls.*', 'http', 'error', 'tags'],
        sort: {
          '@timestamp': { order: 'desc' },
        },
      },
    };
    mockEsSearchResult = {
      hits: {
        hits: [
          {
            _id: 'fejwio32',
            _source: {
              '@timestamp': '123456',
              monitor: {
                duration: {
                  us: 12345,
                },
                id: 'testMonitor',
                status: 'down',
                type: 'http',
              },
            },
          },
        ],
      },
    };
  });

  it('returns data in expected shape', async () => {
    const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

    mockEsClient.search.mockResponseOnce(mockEsSearchResult);

    const result = await getLatestMonitor({
      uptimeEsClient,
      dateStart: 'now-1h',
      dateEnd: 'now',
      monitorId: 'testMonitor',
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "@timestamp": "123456",
        "docId": "fejwio32",
        "monitor": Object {
          "duration": Object {
            "us": 12345,
          },
          "id": "testMonitor",
          "status": "down",
          "type": "http",
        },
        "timestamp": "123456",
        "tls": undefined,
      }
    `);
    expect(result.timestamp).toBe('123456');
    expect(result.monitor).not.toBeFalsy();
    expect(result?.monitor?.id).toBe('testMonitor');
    expect(mockEsClient.search).toHaveBeenCalledWith(expectedGetLatestSearchParams, { meta: true });
  });
});
