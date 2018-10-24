/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const waffleNodesQuery = gql`
  query WaffleNodesQuery(
    $sourceId: ID!
    $timerange: InfraTimerangeInput!
    $filterQuery: String
    $metric: InfraMetricInput!
    $path: [InfraPathInput!]!
  ) {
    source(id: $sourceId) {
      id
      map(timerange: $timerange, filterQuery: $filterQuery) {
        nodes(path: $path, metric: $metric) {
          path {
            value
          }
          metric {
            name
            value
          }
        }
      }
    }
  }
`;
