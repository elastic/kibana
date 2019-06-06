/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const snapshotQueryString = `
query Snapshot(
  $dateRangeStart: String!
  $dateRangeEnd: String!
  $filters: String
) {
snapshot: getSnapshot(
  dateRangeStart: $dateRangeStart
  dateRangeEnd: $dateRangeEnd
  filters: $filters
) {
  up
  down
  total
  histogram {
      upCount
      downCount
      x
      x0
      y
    }
  }
}
`;

export const snapshotQuery = gql`
  ${snapshotQueryString}
`;
