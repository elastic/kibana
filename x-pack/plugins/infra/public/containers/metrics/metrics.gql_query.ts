/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const metricsQuery = gql`
  query MetricsQuery(
    $sourceId: ID!
    $timerange: InfraTimerangeInput!
    $metrics: [InfraMetric!]!
    $nodeId: ID!
    $type: InfraNodeType!
  ) {
    source(id: $sourceId) {
      id
      metrics(id: $nodeId, timerange: $timerange, metrics: $metrics, type: $type) {
        id
        series {
          id
          data {
            timestamp
            value
          }
        }
      }
    }
  }
`;
