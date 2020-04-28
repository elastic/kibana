/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const MatrixHistogramGqlQuery = gql`
  query GetMatrixHistogramQuery(
    $defaultIndex: [String!]!
    $filterQuery: String
    $histogramType: HistogramType!
    $inspect: Boolean!
    $sourceId: ID!
    $stackByField: String!
    $timerange: TimerangeInput!
  ) {
    source(id: $sourceId) {
      id
      MatrixHistogram(
        timerange: $timerange
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
        stackByField: $stackByField
        histogramType: $histogramType
      ) {
        matrixHistogramData {
          x
          y
          g
        }
        totalCount
        inspect @include(if: $inspect) {
          dsl
          response
        }
      }
    }
  }
`;
