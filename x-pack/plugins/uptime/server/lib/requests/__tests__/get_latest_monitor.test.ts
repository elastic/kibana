/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getLatestMonitor } from '../get_latest_monitor';
import { defaultDynamicSettings } from '../../../../../../legacy/plugins/uptime/common/runtime_types';

describe('getLatestMonitor', () => {
  let expectedGetLatestSearchParams: any;
  let mockEsSearchResult: any;
  beforeEach(() => {
    expectedGetLatestSearchParams = {
      index: defaultDynamicSettings.heartbeatIndices,
      body: {
        query: {
          bool: {
            filter: [
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
        _source: ['url', 'monitor', 'observer', 'tls', '@timestamp'],
        sort: {
          '@timestamp': { order: 'desc' },
        },
      },
    };
    mockEsSearchResult = {
      hits: {
        hits: [
          {
            _source: {
              timestamp: 123456,
              monitor: {
                id: 'testMonitor',
              },
            },
          },
        ],
      },
    };
  });

  it('returns data in expected shape', async () => {
    const mockEsClient = jest.fn(async (_request: any, _params: any) => mockEsSearchResult);
    const result = await getLatestMonitor({
      callES: mockEsClient,
      dynamicSettings: defaultDynamicSettings,
      dateStart: 'now-1h',
      dateEnd: 'now',
      monitorId: 'testMonitor',
    });

    expect(result.timestamp).toBe(123456);
    expect(result.monitor).not.toBeFalsy();
    expect(result?.monitor?.id).toBe('testMonitor');
    expect(mockEsClient).toHaveBeenCalledWith('search', expectedGetLatestSearchParams);
  });
});
