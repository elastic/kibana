/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function rangeFilter(
  start: number,
  end: number,
  timestampField = '@timestamp'
) {
  return {
    [timestampField]: {
      gte: start,
      lte: end,
      format: 'epoch_millis',
    },
  };
}
