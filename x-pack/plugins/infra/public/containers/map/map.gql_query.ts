/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const mapQuery = gql`
  query MapQuery(
    $sourceId: ID!
    $timerange: InfraTimerangeInput!
    $filters: [InfraFilterInput!]
    $metrics: [InfraMetricInput!]
    $path: [InfraPathInput!]
  ) {
    source(id: $sourceId) {
      id
      map(timerange: $timerange, filters: $filters) {
        nodes(path: $path) {
          path {
            value
          }
          metrics(metrics: $metrics) {
            name
            value
          }
        }
      }
    }
  }
`;
