/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const networkTopNFlowQuery = gql`
  query GetNetworkTopNFlowQuery(
    $sourceId: ID!
    $direction: NetworkTopNFlowDirection!
    $filterQuery: String
    $pagination: PaginationInput!
    $sort: NetworkTopNFlowSortField!
    $type: NetworkTopNFlowType!
    $timerange: TimerangeInput!
  ) {
    source(id: $sourceId) {
      id
      NetworkTopNFlow(
        direction: $direction
        filterQuery: $filterQuery
        pagination: $pagination
        sort: $sort
        timerange: $timerange
        type: $type
      ) {
        totalCount
        edges {
          node {
            source {
              count
              ip
              domain
            }
            destination {
              count
              ip
              domain
            }
            client {
              count
              ip
              domain
            }
            server {
              count
              ip
              domain
            }
            network {
              bytes
              direction
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
