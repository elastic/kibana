/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const networkTopNFlowQuery = gql`
  query GetNetworkTopNFlowQuery(
    $sourceId: ID!
    $type: NetworkTopNFlowType!
    $timerange: TimerangeInput!
    $pagination: PaginationInput!
    $filterQuery: String
  ) {
    source(id: $sourceId) {
      id
      NetworkTopNFlow(
        type: $type
        timerange: $timerange
        pagination: $pagination
        filterQuery: $filterQuery
      ) {
        totalCount
        edges {
          node {
            source {
              ip
              domain
            }
            destination {
              ip
              domain
            }
            event {
              duration
            }
            network {
              bytes
              packets
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
