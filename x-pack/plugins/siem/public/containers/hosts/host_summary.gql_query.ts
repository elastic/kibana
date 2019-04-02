/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const HostSummaryQuery = gql`
  query GetHostSummaryQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $pagination: PaginationInput!
    $filterQuery: String
  ) {
    source(id: $sourceId) {
      id
      Hosts(timerange: $timerange, pagination: $pagination, filterQuery: $filterQuery) {
        totalCount
        edges {
          node {
            _id
            firstSeen
            lastBeat
            host {
              architecture
              id
              ip
              mac
              name
              os {
                family
                name
                platform
                version
              }
              type
            }
          }
          cursor {
            value
          }
        }
        pageInfo {
          endCursor {
            value
          }
          hasNextPage
        }
      }
    }
  }
`;
