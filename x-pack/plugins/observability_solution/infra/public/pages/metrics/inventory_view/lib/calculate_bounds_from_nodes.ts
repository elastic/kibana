/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first, min, max, isFinite } from 'lodash';
import { SnapshotNode } from '../../../../../common/http_api/snapshot_api';
import { InfraWaffleMapBounds } from '../../../../common/inventory/types';

export const calculateBoundsFromNodes = (nodes: SnapshotNode[]): InfraWaffleMapBounds => {
  const values = nodes.map((node) => {
    const metric = first(node.metrics);
    return !metric || !metric.value ? 0 : metric.value;
  });
  // if there is only one value then we need to set the bottom range to zero for min
  // otherwise the legend will look silly since both values are the same for top and
  // bottom.
  if (values.length === 1) {
    values.unshift(0);
  }
  const maxValue = max(values) || 0;
  const minValue = min(values) || 0;
  return { min: isFinite(minValue) ? minValue : 0, max: isFinite(maxValue) ? maxValue : 0 };
};
