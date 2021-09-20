/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';
import { handleResponse, getNodeInfo } from './get_node_info';
import { standaloneClusterFilter } from '../standalone_clusters/standalone_cluster_query_filter';

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

  it('works with standalone cluster', async () => {
    const callWithRequest = jest.fn().mockReturnValue({
      then: jest.fn(),
    });
    const req = {
      server: {
        plugins: {
          elasticsearch: {
            getCluster: () => ({
              callWithRequest,
            }),
          },
        },
      },
    };
    await getNodeInfo(req, '.monitoring-logstash-*', {
      clusterUuid: STANDALONE_CLUSTER_CLUSTER_UUID,
    });
    expect(callWithRequest.mock.calls.length).toBe(1);
    expect(callWithRequest.mock.calls[0].length).toBe(3);
    expect(callWithRequest.mock.calls[0][2].body.query.bool.filter[0]).toBe(
      standaloneClusterFilter
    );
  });
});
