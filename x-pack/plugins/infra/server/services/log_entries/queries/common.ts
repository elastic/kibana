/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const createSortClause = (
  sortDirection: 'asc' | 'desc',
  timestampField: string,
  tiebreakerField: string
) => ({
  sort: {
    [timestampField]: sortDirection,
    [tiebreakerField]: sortDirection,
  },
});

export const createTimeRangeFilterClauses = (
  startTimestamp: number,
  endTimestamp: number,
  timestampField: string
) => [
  {
    range: {
      [timestampField]: {
        gte: startTimestamp,
        lte: endTimestamp,
        format: 'epoch_millis',
      },
    },
  },
];
