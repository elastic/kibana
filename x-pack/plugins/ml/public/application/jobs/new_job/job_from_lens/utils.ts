/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Embeddable } from '@kbn/lens-plugin/public';

export function getJobsItemsFromEmbeddable(embeddable: Embeddable) {
  const { query, filters, timeRange } = embeddable.getInput();

  if (timeRange === undefined) {
    throw Error('Time range not specified.');
  }
  const { to, from } = timeRange;

  const vis = embeddable.getSavedVis();
  if (vis === undefined) {
    throw Error('Visualization cannot be found.');
  }

  return {
    vis,
    from,
    to,
    query,
    filters,
  };
}

export function lensOperationToMlFunction(op: string) {
  switch (op) {
    case 'average':
      return 'mean';
    case 'count':
      return 'count';
    case 'max':
      return 'max';
    case 'median':
      return 'median';
    case 'min':
      return 'min';
    case 'sum':
      return 'sum';
    case 'unique_count':
      return 'distinct_count';

    default:
      return null;
  }
}
