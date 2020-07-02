/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, min, max, isFinite } from 'lodash';
import { SnapshotNode } from '../../../../../common/http_api/snapshot_api';
import { InfraWaffleMapBounds } from '../../../../lib/lib';

export const calculateBoundsFromNodes = (nodes: SnapshotNode[]): InfraWaffleMapBounds => {
  const maxValues = nodes.map((node) => {
    const metric = first(node.metrics);
    if (!metric) return 0;
    return metric.max;
  });
  const minValues = nodes.map((node) => {
    const metric = first(node.metrics);
    if (!metric) return 0;
    return metric.value;
  });
  // if there is only one value then we need to set the bottom range to zero for min
  // otherwise the legend will look silly since both values are the same for top and
  // bottom.
  if (minValues.length === 1) {
    minValues.unshift(0);
  }
  const maxValue = max(maxValues) || 0;
  const minValue = min(minValues) || 0;
  return { min: isFinite(minValue) ? minValue : 0, max: isFinite(maxValue) ? maxValue : 0 };
};
