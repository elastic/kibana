/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const getSnapshotQuery = gql`
  query Snapshot(
    $start: UnsignedInteger
    $end: UnsignedInteger
    $downCount: Int
    $windowSize: Int
  ) {
    snapshot: getSnapshot(
      start: $start
      end: $end
      downCount: $downCount
      windowSize: $windowSize
    ) {
      up
      down
      trouble
      total
      histogram {
        upSeries {
          x
          x0
          y
        }
        downSeries {
          x
          x0
          y
        }
      }
    }
  }
`;
