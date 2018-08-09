/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import gql from 'graphql-tag';
export const query = gql`
  query Query(
    $id: ID!
    $timerange: InfraTimerange!
    $filters: [InfraFilter!]
    $metrics: [InfraMetric!]
    $path: [InfraPath!]
  ) {
    source(id: $id) {
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
