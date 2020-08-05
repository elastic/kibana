/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const matrixHistogramSchema = gql`
  type MatrixOverTimeHistogramData {
    x: Float
    y: Float
    g: String
  }

  type MatrixHistogramOverTimeData {
    inspect: Inspect
    matrixHistogramData: [MatrixOverTimeHistogramData!]!
    totalCount: Float!
  }

  enum HistogramType {
    authentications
    anomalies
    events
    alerts
    dns
  }

  extend type Source {
    MatrixHistogram(
      filterQuery: String
      defaultIndex: [String!]!
      timerange: TimerangeInput!
      stackByField: String!
      histogramType: HistogramType!
    ): MatrixHistogramOverTimeData!
  }
`;
