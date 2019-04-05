/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const domainsQuery = gql`
  query GetDomainsQuery(
    $sourceId: ID!
    $direction: FlowDirection!
    $filterQuery: String
    $ip: String!
    $pagination: PaginationInput!
    $sort: DomainsSortField!
    $timerange: TimerangeInput!
    $type: FlowType!
  ) {
    source(id: $sourceId) {
      id
      Domains(
        direction: $direction
        filterQuery: $filterQuery
        ip: $ip
        pagination: $pagination
        sort: $sort
        timerange: $timerange
        type: $type
      ) {
        totalCount
        edges {
          node {
            source {
              uniqueIpCount
              domainName
              firstSeen
              lastSeen
            }
            destination {
              uniqueIpCount
              domainName
              firstSeen
              lastSeen
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
