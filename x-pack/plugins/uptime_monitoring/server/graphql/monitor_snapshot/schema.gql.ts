/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const snapshotSchema = gql`
  type HistogramDataPoint {
    x: UnsignedInteger
    x0: UnsignedInteger
    y: UnsignedInteger
  }

  type HistogramSeries {
    series: [HistogramDataPoint]
  }

  type SnapshotHistogram {
    upSeries: [HistogramDataPoint]
    downSeries: [HistogramDataPoint]
  }

  type Snapshot {
    up: Int
    down: Int
    trouble: Int
    total: Int
    histogram: SnapshotHistogram
  }
  extend type Query {
    getSnapshot(
      start: UnsignedInteger
      end: UnsignedInteger
      downCount: Int
      windowSize: Int
    ): Snapshot
  }
`;
