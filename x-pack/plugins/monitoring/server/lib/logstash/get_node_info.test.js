/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { handleResponse } from './get_node_info';

describe('get_logstash_info', () => {
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
              logstash_stats: {
                timestamp: moment().format(),
                logstash: {
                  host: 'myhost',
                },
                events: {
                  in: 300,
                  filtered: 300,
                  out: 300,
                },
                reloads: {
                  successes: 5,
                  failures: 2,
                },
                queue: {
                  type: 'persisted',
                  events: 100,
                },
              },
            },
          },
        ],
      },
    });
    expect(result).toEqual({
      host: 'myhost',
      availability: true,
      events: {
        filtered: 300,
        in: 300,
        out: 300,
      },
      reloads: {
        successes: 5,
        failures: 2,
      },
      queue_type: 'persisted',
    });
  });

  it('return mapped data for result with hits, availability = false', () => {
    const result = handleResponse({
      hits: {
        hits: [
          {
            _source: {
              logstash_stats: {
                timestamp: moment().subtract(11, 'minutes').format(),
                logstash: {
                  host: 'myhost',
                },
                events: {
                  in: 300,
                  filtered: 300,
                  out: 300,
                },
                reloads: {
                  successes: 5,
                  failures: 2,
                },
                queue: {
                  type: 'persisted',
                  events: 100,
                },
              },
            },
          },
        ],
      },
    });
    expect(result).toEqual({
      host: 'myhost',
      availability: false,
      events: {
        filtered: 300,
        in: 300,
        out: 300,
      },
      reloads: {
        successes: 5,
        failures: 2,
      },
      queue_type: 'persisted',
    });
  });

  it('default to no queue type if none specified', () => {
    const result = handleResponse({
      hits: {
        hits: [
          {
            _source: {
              logstash_stats: {
                timestamp: moment().subtract(11, 'minutes').format(),
                logstash: {
                  host: 'myhost',
                },
                events: {
                  in: 300,
                  filtered: 300,
                  out: 300,
                },
                reloads: {
                  successes: 5,
                  failures: 2,
                },
              },
            },
          },
        ],
      },
    });
    expect(result).toEqual({
      host: 'myhost',
      availability: false,
      events: {
        filtered: 300,
        in: 300,
        out: 300,
      },
      reloads: {
        successes: 5,
        failures: 2,
      },
    });
  });
});
