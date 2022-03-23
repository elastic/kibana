/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { set, unset } from 'lodash';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';
import { handleResponse, getNodeInfo } from './get_node_info';
import { LegacyRequest } from '../../types';
import { ElasticsearchResponseHit } from '../../../common/types/es';
import { standaloneClusterFilter } from '../standalone_clusters/standalone_cluster_query_filter';

interface HitParams {
  path: string;
  value?: string;
}

jest.mock('../../static_globals', () => ({
  Globals: {
    app: {
      config: {
        ui: {
          ccs: { enabled: true },
        },
      },
    },
  },
}));

// deletes, adds, or updates the properties based on a default object
function createResponseObjHit(params?: HitParams[]): ElasticsearchResponseHit {
  const defaultResponseObj: ElasticsearchResponseHit = {
    _index: 'index',
    _source: {
      cluster_uuid: '123',
      timestamp: '2021-08-31T15:00:26.330Z',
      logstash_stats: {
        timestamp: moment().format(),
        logstash: {
          pipeline: {
            batch_size: 2,
            workers: 2,
          },
          host: 'myhost',
          uuid: 'd63b22f8-7f77-4a23-9aac-9813c760e0e0',
          version: '8.0.0',
          status: 'green',
          name: 'desktop-192-168-162-170.local',
          http_address: '127.0.0.1:9600',
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
  };

  if (!params) return defaultResponseObj;
  return params.reduce<ElasticsearchResponseHit>((acc, change) => {
    if (!change.value) {
      // delete if no value provided
      unset(acc, change.path);
      return acc;
    }
    return set(acc, change.path, change.value);
  }, defaultResponseObj);
}

const createResponseFromHits = (hits: ElasticsearchResponseHit[]) => {
  return {
    hits: {
      total: {
        value: hits.length,
      },
      hits,
    },
  };
};

describe('get_logstash_info', () => {
  it('return mapped data for result with hits, availability = true', () => {
    const hits = [createResponseObjHit()];
    const res = createResponseFromHits(hits);
    const result = handleResponse(res);
    expect(result).toEqual({
      host: 'myhost',
      uuid: 'd63b22f8-7f77-4a23-9aac-9813c760e0e0',
      version: '8.0.0',
      status: 'green',
      uptime: undefined,
      name: 'desktop-192-168-162-170.local',
      pipeline: {
        batch_size: 2,
        workers: 2,
      },
      http_address: '127.0.0.1:9600',
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
    const hits = [
      createResponseObjHit([
        {
          path: '_source.logstash_stats.timestamp',
          value: moment().subtract(11, 'minutes').format(),
        },
      ]),
    ];
    const res = createResponseFromHits(hits);

    const result = handleResponse(res);
    expect(result).toEqual({
      host: 'myhost',
      pipeline: {
        batch_size: 2,
        workers: 2,
      },
      uuid: 'd63b22f8-7f77-4a23-9aac-9813c760e0e0',
      version: '8.0.0',
      status: 'green',
      name: 'desktop-192-168-162-170.local',
      http_address: '127.0.0.1:9600',
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
    const hits = [
      createResponseObjHit([
        {
          path: '_source.logstash_stats.queue', // delete queue property
        },
        {
          path: '_source.logstash_stats.timestamp', // update the timestamp property
          value: moment().subtract(11, 'minutes').format(),
        },
      ]),
    ];
    const res = createResponseFromHits(hits);
    const result = handleResponse(res);
    expect(result).toEqual({
      host: 'myhost',
      pipeline: {
        batch_size: 2,
        workers: 2,
      },
      uuid: 'd63b22f8-7f77-4a23-9aac-9813c760e0e0',
      version: '8.0.0',
      status: 'green',
      name: 'desktop-192-168-162-170.local',
      http_address: '127.0.0.1:9600',
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
      payload: {},
      server: {
        config: () => ({
          get: () => undefined,
        }),
        plugins: {
          elasticsearch: {
            getCluster: () => ({
              callWithRequest,
            }),
          },
        },
      },
    } as unknown as LegacyRequest;

    await getNodeInfo(req, {
      clusterUuid: STANDALONE_CLUSTER_CLUSTER_UUID,
      logstashUuid: 'logstash_uuid',
    });
    expect(callWithRequest.mock.calls.length).toBe(1);
    expect(callWithRequest.mock.calls[0].length).toBe(3);
    expect(callWithRequest.mock.calls[0][2].body.query.bool.filter[0]).toBe(
      standaloneClusterFilter
    );
  });
});
