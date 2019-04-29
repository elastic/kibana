/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const logSummaryQuery = gql`
  query LogSummary(
    $sourceId: ID = "default"
    $start: Float!
    $end: Float!
    $bucketSize: Float!
    $filterQuery: String
  ) {
    source(id: $sourceId) {
      id
      logSummaryBetween(
        start: $start
        end: $end
        bucketSize: $bucketSize
        filterQuery: $filterQuery
      ) {
        start
        end
        buckets {
          start
          end
          entriesCount
        }
      }
    }
  }
`;
