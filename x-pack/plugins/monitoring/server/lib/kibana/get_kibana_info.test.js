/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { handleResponse } from './get_kibana_info';

jest.mock('../../static_globals', () => ({
  Globals: {
    app: {
      config: {
        ui: {
          kibana: {
            reporting: {
              stale_status_threshold_seconds: 120,
            },
          },
        },
      },
    },
  },
}));

describe('get_kibana_info', () => {
  // TODO: test was not running before and is not up to date
  it.skip('return undefined for empty response', () => {
    const result = handleResponse({});
    expect(result).toBe(undefined);
  });

  it('return mapped data for result with hits, availability = true', () => {
    const timestamp = moment().format();
    const result = handleResponse({
      hits: {
        hits: [
          {
            _source: {
              kibana_stats: {
                timestamp,
                kibana: {
                  data: 123,
                },
                os: {
                  memory: {
                    free_in_bytes: 123000,
                  },
                },
                process: {
                  uptime_in_millis: 3000,
                },
              },
            },
          },
        ],
      },
    });
    expect(result).toEqual({
      lastSeenTimestamp: timestamp,
      statusIsStale: false,
      data: 123,
      os_memory_free: 123000,
      uptime: 3000,
    });
  });

  it('return mapped data for result with hits, availability = false', () => {
    const timestamp = moment().subtract(11, 'minutes').format();
    const result = handleResponse({
      hits: {
        hits: [
          {
            _source: {
              kibana_stats: {
                timestamp,
                kibana: {
                  data: 123,
                },
                os: {
                  memory: {
                    free_in_bytes: 123000,
                  },
                },
                process: {
                  uptime_in_millis: 3000,
                },
              },
            },
          },
        ],
      },
    });
    expect(result).toEqual({
      lastSeenTimestamp: timestamp,
      statusIsStale: true,
      data: 123,
      os_memory_free: 123000,
      uptime: 3000,
    });
  });
});
