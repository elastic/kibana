/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

//This function just adds some stub indices that includes a timestamp and an arbritary metric. This is fine since we are not actually testing
//rollup functionality.
export function mockIndices(day, prepend) {
  return {
    index: `${prepend}-${day.format('MM-DD-YYYY')}`,
    body: {
      '@timestamp': day.toISOString(),
      foo_metric: 1,
    },
  };
}
