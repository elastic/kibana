/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { handleResponse } from './get_kibana_info';

describe('get_kibana_info', () => {
  // TODO: test was not running before and is not up to date
  it.skip('return undefined for empty response', () => {
    const result = handleResponse({});
    expect(result).toBe(undefined);
  });

  it('return mapped data for result with hits, availability = true', () => {
    const result = handleResponse({
      hits: {
        hits: [
          {
            _source: {
              kibana_stats: {
                timestamp: moment().format(),
                kibana: {
                  data: 123,
                },
                os: {
                  memory: {
                    free_in_bytes: 123000,
                  },
                },
              },
            },
          },
        ],
      },
    });
    expect(result).toEqual({
      availability: true,
      data: 123,
      os_memory_free: 123000,
    });
  });

  it('return mapped data for result with hits, availability = false', () => {
    const result = handleResponse({
      hits: {
        hits: [
          {
            _source: {
              kibana_stats: {
                timestamp: moment().subtract(11, 'minutes').format(),
                kibana: {
                  data: 123,
                },
                os: {
                  memory: {
                    free_in_bytes: 123000,
                  },
                },
              },
            },
          },
        ],
      },
    });
    expect(result).toEqual({
      availability: false,
      data: 123,
      os_memory_free: 123000,
    });
  });
});
