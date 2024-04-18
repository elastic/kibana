/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  InfraTimerangeInput,
  MetricsAPIRequest,
  SnapshotRequest,
} from '../../../../common/http_api';
import moment from 'moment';
import { transformMetricsApiResponseToSnapshotResponse } from './transform_metrics_ui_response';

jest.mock('./apply_metadata_to_last_path', () => ({
  applyMetadataToLastPath: (series: any) => [{ label: series.id }],
}));

const now = moment('2020-01-01T00:00:00Z').add(5, 'minute').valueOf();

const timerange: InfraTimerangeInput = {
  from: moment('2020-01-01T00:00:00Z').valueOf(),
  to: now,
  interval: '1m',
};

const snapshotApiRequest: SnapshotRequest = {
  metrics: [{ type: 'cpu' }],
  includeTimeseries: false,
  timerange,
  groupBy: [],
  nodeType: 'host',
  sourceId: '',
};

const metricsApiRequest: MetricsAPIRequest = {
  metrics: [
    {
      id: 'cpu',
      aggregations: { cpu: { avg: { field: 'system.cpu.user.pct' } } },
    },
  ],
  includeTimeseries: false,
  timerange,
  indexPattern: 'metrics-*',
};

describe('transformMetricsApiResponseToSnapshotResponse', () => {
  test('filters out nodes from APM which report no data', () => {
    const result = transformMetricsApiResponseToSnapshotResponse(
      metricsApiRequest,
      snapshotApiRequest,
      {
        info: {
          afterKey: null,
          interval: 60,
        },
        series: [
          {
            metricsets: ['app'],
            id: 'apm-node-with-no-data',
            columns: [],
            rows: [
              {
                timestamp: now,
                cpu: null,
              },
            ],
          },
          {
            metricsets: ['app'],
            id: 'apm-node-with-data',
            columns: [],
            rows: [
              {
                timestamp: now,
                cpu: 1.0,
              },
            ],
          },
          {
            metricsets: ['cpu'],
            id: 'metricbeat-node',
            columns: [],
            rows: [
              {
                timestamp: now,
                cpu: 1.0,
              },
            ],
          },
        ],
      }
    );
    const nodeNames = result.nodes.map((n) => n.name);
    expect(nodeNames).toEqual(expect.arrayContaining(['metricbeat-node', 'apm-node-with-data']));
    expect(nodeNames).not.toEqual(expect.arrayContaining(['apm-node']));
  });
});
