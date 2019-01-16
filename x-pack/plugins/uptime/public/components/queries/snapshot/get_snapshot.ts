/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const getSnapshotQuery = gql`
  query Snapshot(
    $dateRangeStart: UnsignedInteger
    $dateRangeEnd: UnsignedInteger
    $downCount: Int
    $windowSize: Int
    $filters: String
  ) {
    snapshot: getSnapshot(
      dateRangeStart: $dateRangeStart
      dateRangeEnd: $dateRangeEnd
      downCount: $downCount
      windowSize: $windowSize
      filters: $filters
    ) {
      up
      down
      trouble
      total
      histogram {
        monitorId
        data {
          upCount
          downCount
          x
          x0
          y
        }
      }
    }
  }
`;
