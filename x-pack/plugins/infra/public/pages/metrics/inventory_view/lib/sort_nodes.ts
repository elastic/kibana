/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy, last, first } from 'lodash';
import { SnapshotNode } from '../../../../../common/http_api/snapshot_api';
import { WaffleSortOption } from '../hooks/use_waffle_options';

const SORT_PATHS = {
  name: (node: SnapshotNode) => last(node.path),
  value: (node: SnapshotNode) => {
    const metric = first(node.metrics);
    return (metric && metric.value) || 0;
  },
};

export const sortNodes = (sort: WaffleSortOption, nodes: SnapshotNode[]) => {
  const sortPath = SORT_PATHS[sort.by];
  const sortedNodes = sortBy(nodes, sortPath);
  if (sort.direction === 'desc') {
    return sortedNodes.reverse();
  }
  return sortedNodes;
};
