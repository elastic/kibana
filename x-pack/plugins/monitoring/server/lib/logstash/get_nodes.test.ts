/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNodes } from './get_nodes';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';
import { LegacyRequest } from '../../types';
import sinon from 'sinon';

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

describe('getNodes', () => {
  it('ensures collapse key is present query responses', async () => {
    const response = {};

    const config = {
      get: sinon.stub(),
    };
    config.get.withArgs('monitoring.ui.max_bucket_size').returns(10000);

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

    await getNodes(req, {
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
