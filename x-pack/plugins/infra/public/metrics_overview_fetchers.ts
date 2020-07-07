/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { sum, isFinite, isNumber } from 'lodash';
import { i18n } from '@kbn/i18n';
import { MetricsFetchDataResponse, FetchDataParams } from '../../observability/public';
import {
  SnapshotRequest,
  SnapshotMetricInput,
  SnapshotNode,
  SnapshotNodeResponse,
} from '../common/http_api/snapshot_api';
import { SnapshotMetricType } from '../common/inventory_models/types';
import { InfraClientCoreSetup } from './types';

export const createMetricsHasData = (
  getStartServices: InfraClientCoreSetup['getStartServices']
) => async () => {
  const [coreServices] = await getStartServices();
  const { http } = coreServices;
  const results = await http.get<{ hasData: boolean }>(
    '/api/metrics/source/default/metrics/hasData'
  );
  return results.hasData;
};

export const average = (values: number[]) => (values.length ? sum(values) / values.length : 0);

export const combineNodesBy = (
  metric: SnapshotMetricType,
  nodes: SnapshotNode[],
  combinator: (values: number[]) => number
) => {
  const values = nodes.reduce((acc, node) => {
    const snapshotMetric = node.metrics.find((m) => m.name === metric);
    if (snapshotMetric?.value != null && isFinite(snapshotMetric.value)) {
      acc.push(snapshotMetric.value);
    }
    return acc;
  }, [] as number[]);
  return combinator(values);
};

interface CombinedRow {
  values: number[];
  timestamp: number;
}

export const combineNodeTimeseriesBy = (
  metric: SnapshotMetricType,
  nodes: SnapshotNode[],
  combinator: (values: number[]) => number
) => {
  const combinedTimeseries = nodes.reduce((acc, node) => {
    const snapshotMetric = node.metrics.find((m) => m.name === metric);
    if (snapshotMetric && snapshotMetric.timeseries) {
      snapshotMetric.timeseries.rows.forEach((row) => {
        const combinedRow = acc.find((r) => r.timestamp === row.timestamp);
        if (combinedRow) {
          combinedRow.values.push(isNumber(row.metric_0) ? row.metric_0 : 0);
        } else {
          acc.push({
            timestamp: row.timestamp,
            values: [isNumber(row.metric_0) ? row.metric_0 : 0],
          });
        }
      });
    }
    return acc;
  }, [] as CombinedRow[]);
  return combinedTimeseries.map((row) => ({ x: row.timestamp, y: combinator(row.values) }));
};

export const createMetricsFetchData = (
  getStartServices: InfraClientCoreSetup['getStartServices']
) => async ({
  startTime,
  endTime,
  bucketSize,
}: FetchDataParams): Promise<MetricsFetchDataResponse> => {
  const [coreServices] = await getStartServices();
  const { http } = coreServices;
  const snapshotRequest: SnapshotRequest = {
    sourceId: 'default',
    metrics: ['cpu', 'memory', 'rx', 'tx'].map((type) => ({ type })) as SnapshotMetricInput[],
    groupBy: [],
    nodeType: 'host',
    includeTimeseries: true,
    timerange: {
      from: moment(startTime).valueOf(),
      to: moment(endTime).valueOf(),
      interval: bucketSize,
      forceInterval: true,
      ignoreLookback: true,
    },
  };

  const results = await http.post<SnapshotNodeResponse>('/api/metrics/snapshot', {
    body: JSON.stringify(snapshotRequest),
  });

  return {
    title: i18n.translate('xpack.infra.observabilityHomepage.metrics.title', {
      defaultMessage: 'Metrics',
    }),
    appLink: '/app/metrics',
    stats: {
      hosts: {
        type: 'number',
        value: results.nodes.length,
      },
      cpu: {
        type: 'percent',
        value: combineNodesBy('cpu', results.nodes, average),
      },
      memory: {
        type: 'percent',
        value: combineNodesBy('memory', results.nodes, average),
      },
      inboundTraffic: {
        type: 'bytesPerSecond',
        value: combineNodesBy('rx', results.nodes, average),
      },
      outboundTraffic: {
        type: 'bytesPerSecond',
        value: combineNodesBy('tx', results.nodes, average),
      },
    },
    series: {
      inboundTraffic: {
        coordinates: combineNodeTimeseriesBy('rx', results.nodes, average),
      },
      outboundTraffic: {
        coordinates: combineNodeTimeseriesBy('tx', results.nodes, average),
      },
    },
  };
};
