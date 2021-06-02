/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, last, mean, max } from 'lodash';
import { findInventoryFields } from '../../../../common/inventory_models';
import {
  SnapshotNodeResponse,
  SnapshotRequest,
  SnapshotNode,
  SnapshotNodePath,
  SnapshotNodeMetric,
} from '../../../../common/http_api';
import { InfraSource } from '../../../lib/sources';
import { META_KEY } from './constants';
import { SnapshotAggregationBucket } from './query_all_data';

const extractPathFromBucket = (
  options: SnapshotRequest,
  bucket: SnapshotAggregationBucket,
  source: InfraSource
): SnapshotNodePath[] => {
  const inventoryFields = findInventoryFields(options.nodeType, source.configuration.fields);
  const metadata = bucket[META_KEY].top[0].metrics;
  const nodeValue = `${bucket.key.node}`;
  const nodeLabel = metadata[inventoryFields.name] || nodeValue;
  const nodePath: SnapshotNodePath = { value: nodeValue, label: nodeLabel };
  if (inventoryFields.ip && metadata[inventoryFields.ip]) {
    nodePath.ip = metadata[inventoryFields.ip];
  }
  const groupPath = Object.keys(options.groupBy || [])
    .map((index) => {
      const value = bucket.key[`group_${index}`];
      if (value) {
        return { value, label: value };
      }
    })
    .filter(Boolean) as SnapshotNodePath[];
  return [...groupPath, nodePath];
};

const pathToKey = (path: SnapshotNodePath[]) => path.map((p) => p.value).join();

const matchBucket = (
  options: SnapshotRequest,
  bucket: SnapshotAggregationBucket,
  source: InfraSource
) => {
  const bucketKey = pathToKey(extractPathFromBucket(options, bucket, source));
  return (node: SnapshotNode) => {
    const key = pathToKey(node.path);
    return key === bucketKey;
  };
};

const extractMetricsFromBucket = (
  existingMetrics: SnapshotNodeMetric[],
  options: SnapshotRequest,
  bucket: SnapshotAggregationBucket
): SnapshotNodeMetric[] => {
  return options.metrics.map((metric, index) => {
    const metricName = metric.type === 'custom' ? `custom_${index}` : metric.type;
    const existingMetric = existingMetrics.find((m) => m.name === metricName);
    if (existingMetric && existingMetric.timeseries) {
      existingMetric.timeseries.rows.push({
        timestamp: bucket.key.timeseries as number,
        metric_0: bucket[metricName]?.value ?? null,
      });
      existingMetric.timeseries.rows.sort((a, b) => a.timestamp - b.timestamp);
      const lastRow = last(existingMetric.timeseries.rows);
      existingMetric.value = (lastRow && (lastRow.metric_0 as number)) || existingMetric.value;
      existingMetric.max = max(
        existingMetric.timeseries.rows.map((r) => r.metric_0 as number).filter(Boolean)
      );
      existingMetric.avg = mean(
        existingMetric.timeseries.rows.map((r) => r.metric_0 as number).filter(Boolean)
      );
      return existingMetric;
    }

    return {
      name: metricName,
      avg: bucket[metricName]?.value ?? 0,
      value: bucket[metricName]?.value ?? 0,
      max: bucket[metricName]?.value ?? 0,
      timeseries: {
        id: metricName,
        columns: [
          { name: 'timestamp', type: 'date' },
          { name: 'metric_0', type: 'number' },
        ],
        rows: [
          {
            timestamp: bucket.key.timeseries as number,
            metric_0: bucket[metricName]?.value ?? null,
          },
        ],
      },
    };
  });
};

export const convertSnapshotBucketsToSnapshotResponse = (
  options: SnapshotRequest,
  buckets: SnapshotAggregationBucket[],
  source: InfraSource
): SnapshotNodeResponse => {
  const nodeCache = new Map<string, SnapshotNode>();
  buckets.forEach((bucket) => {
    const cacheKey = pathToKey(extractPathFromBucket(options, bucket, source));
    const currentNode = nodeCache.get(cacheKey);
    if (currentNode) {
      currentNode.metrics = extractMetricsFromBucket(currentNode.metrics, options, bucket);
    } else {
      const newNode: SnapshotNode = {
        metrics: extractMetricsFromBucket([], options, bucket),
        path: extractPathFromBucket(options, bucket, source),
        name: bucket.key.node as string,
      };
      nodeCache.set(cacheKey, newNode);
    }
  });

  const nodes: SnapshotNode[] = [];
  for (const node of nodeCache.values()) {
    nodes.push(node as SnapshotNode);
  }
  return { nodes, interval: '60s' };
};
