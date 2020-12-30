/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, max, sum, last, isNumber } from 'lodash';
import { SnapshotMetricType } from '../../../../common/inventory_models/types';
import {
  MetricsAPIResponse,
  SnapshotNodeResponse,
  MetricsAPIRequest,
  MetricsExplorerColumnType,
  MetricsAPIRow,
  SnapshotRequest,
  SnapshotNodePath,
  SnapshotNodeMetric,
} from '../../../../common/http_api';
import { META_KEY } from './constants';
import { InfraSource } from '../../../lib/sources';
import { applyMetadataToLastPath } from './apply_metadata_to_last_path';

const getMetricValue = (row: MetricsAPIRow) => {
  if (!isNumber(row.metric_0)) return null;
  const value = row.metric_0;
  return isFinite(value) ? value : null;
};

const calculateMax = (rows: MetricsAPIRow[]) => {
  return max(rows.map(getMetricValue)) || 0;
};

const calculateAvg = (rows: MetricsAPIRow[]): number => {
  return sum(rows.map(getMetricValue)) / rows.length || 0;
};

const getLastValue = (rows: MetricsAPIRow[]) => {
  const row = last(rows);
  if (!row) return null;
  return getMetricValue(row);
};

export const transformMetricsApiResponseToSnapshotResponse = (
  options: MetricsAPIRequest,
  snapshotRequest: SnapshotRequest,
  source: InfraSource,
  metricsApiResponse: MetricsAPIResponse
): SnapshotNodeResponse => {
  const nodes = metricsApiResponse.series.map((series) => {
    const node = {
      metrics: options.metrics
        .filter((m) => m.id !== META_KEY)
        .map((metric) => {
          const name = metric.id as SnapshotMetricType;
          const timeseries = {
            id: name,
            columns: [
              { name: 'timestamp', type: 'date' as MetricsExplorerColumnType },
              { name: 'metric_0', type: 'number' as MetricsExplorerColumnType },
            ],
            rows: series.rows.map((row) => {
              return { timestamp: row.timestamp, metric_0: get(row, metric.id, null) };
            }),
          };
          const maxValue = calculateMax(timeseries.rows);
          const avg = calculateAvg(timeseries.rows);
          const value = getLastValue(timeseries.rows);
          const nodeMetric: SnapshotNodeMetric = { name, max: maxValue, value, avg };
          if (snapshotRequest.includeTimeseries) {
            nodeMetric.timeseries = timeseries;
          }
          return nodeMetric;
        }),
      path:
        series.keys?.map((key) => {
          return { value: key, label: key } as SnapshotNodePath;
        }) ?? [],
      name: '',
    };

    const path = applyMetadataToLastPath(series, node, snapshotRequest, source);
    const lastPath = last(path);
    const name = (lastPath && lastPath.label) || 'N/A';
    return { ...node, path, name };
  });
  return { nodes, interval: `${metricsApiResponse.info.interval}s` };
};
