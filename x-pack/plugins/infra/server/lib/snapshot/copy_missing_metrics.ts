/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize, last, first } from 'lodash';
import { SnapshotNode } from '../../../common/http_api/snapshot_api';

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

export const copyMissingMetrics = (nodes: SnapshotNode[]) => {
  const find = createMissingMetricFinder(nodes);
  return nodes.map((node) => {
    const lastPath = last(node.path);
    const metric = first(node.metrics);
    if (lastPath && metric && metric.value === null) {
      const newMetrics = find(lastPath.value);
      if (newMetrics) {
        return { ...node, metrics: newMetrics };
      }
    }
    return node;
  });
};
