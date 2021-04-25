/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleResponse } from './get_beats_for_clusters';

describe('get_beats_for_clusters', () => {
  it('Handles empty aggregation', () => {
    const clusterUuid = 'foo_uuid';
    const response = {};
    expect(handleResponse(clusterUuid, response)).toEqual({
      clusterUuid: 'foo_uuid',
      stats: {
        totalEvents: 0,
        bytesSent: 0,
        beats: {
          total: 0,
          types: [],
        },
      },
    });
  });

  it('Combines stats', () => {
    const clusterUuid = 'foo_uuid';
    const response = {
      aggregations: {
        total: {
          value: 1400,
        },
        types: {
          buckets: [
            { key: 'filebeat', uuids: { buckets: new Array(1000) } },
            { key: 'metricbeat', uuids: { buckets: new Array(1200) } },
          ],
        },
        min_events_total: { value: 83472836 },
        max_events_total: { value: 89972836 },
        min_bytes_sent_total: { value: 293476 },
        max_bytes_sent_total: { value: 333476 },
      },
    };
    expect(handleResponse(clusterUuid, response)).toEqual({
      clusterUuid: 'foo_uuid',
      stats: {
        totalEvents: 6500000,
        bytesSent: 40000,
        beats: {
          total: 1400,
          types: [
            {
              count: 1000,
              type: 'Filebeat',
            },
            {
              count: 1200,
              type: 'Metricbeat',
            },
          ],
        },
      },
    });
  });
});
