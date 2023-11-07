/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize, last, first } from 'lodash';
import { SnapshotNode, SnapshotNodeResponse } from '../../../../common/http_api';

const createMissingMetricFinder = (nodes: SnapshotNode[]) =>
  memoize((id: string) => {
    const nodeWithMetrics = nodes.find((node) => {
      const lastPath = last(node.path);
      const metric = first(node.metrics);
      return lastPath && metric && lastPath.value === id && metric.value !== null;
    });
    if (nodeWithMetrics) {
      return nodeWithMetrics.metrics;
    }
  });

/**
 * This function will look for nodes with missing data and try to find a node to copy the data from.
 * This functionality exists to suppor the use case where the user requests a group by on "Service type".
 * Since that grouping naturally excludeds every metric (except the metric for the service.type), we still
 * want to display the node with a value. A good example is viewing hosts by CPU Usage and grouping by service
 * Without this every service but `system` would be null.
 */
export const copyMissingMetrics = (response: SnapshotNodeResponse) => {
  const { nodes } = response;
  const find = createMissingMetricFinder(nodes);
  const newNodes = nodes.map((node) => {
    const lastPath = last(node.path);
    const metric = first(node.metrics);
    const allRowsNull = metric?.timeseries?.rows.every((r) => r.metric_0 == null) ?? true;
    if (lastPath && metric && metric.value === null && allRowsNull) {
      const newMetrics = find(lastPath.value);
      if (newMetrics) {
        return { ...node, metrics: newMetrics };
      }
    }
    return node;
  });
  return { ...response, nodes: newNodes };
};
