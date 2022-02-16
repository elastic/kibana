/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNodes } from './get_nodes';
import { INDEX_PATTERN_LOGSTASH, STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';
import { LegacyRequest } from '../../types';

describe('getNodes', () => {
  it('ensures collapse key is present query responses', async () => {
    const configs: { [key: string]: number } = { 'monitoring.ui.max_bucket_size': 10000 };
    const config = {
      get: jest.fn().mockImplementation((key: string) => configs[key]),
    };

    const response = {};
    const callWithRequest = jest.fn().mockResolvedValue(response);

    const req = {
      server: {
        config() {
          return config;
        },
        plugins: {
          elasticsearch: {
            getCluster: () => ({
              callWithRequest,
            }),
          },
        },
      },
      payload: {
        // borrowed from detail_drawer.test.js
        timeRange: {
          min: 1516131138639,
          max: 1516135440463,
        },
      },
    } as unknown as LegacyRequest;

    await getNodes(req, INDEX_PATTERN_LOGSTASH, {
      clusterUuid: STANDALONE_CLUSTER_CLUSTER_UUID,
    });

    expect(callWithRequest.mock.calls.length).toBe(1);
    expect(callWithRequest.mock.calls[0].length).toBe(3);

    const filters = callWithRequest.mock.calls[0][2].body.query.bool.filter;
    expect(filters).toContainEqual(
      expect.objectContaining({
        exists: {
          field: 'logstash_stats.logstash.uuid',
        },
      })
    );
  });
});
