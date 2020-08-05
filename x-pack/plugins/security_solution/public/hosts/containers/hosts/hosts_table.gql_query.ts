/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const HostsTableQuery = gql`
  query GetHostsTableQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $pagination: PaginationInputPaginated!
    $sort: HostsSortField!
    $filterQuery: String
    $defaultIndex: [String!]!
    $inspect: Boolean!
    $docValueFields: [docValueFieldsInput!]!
  ) {
    source(id: $sourceId) {
      id
      Hosts(
        timerange: $timerange
        pagination: $pagination
        sort: $sort
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
        docValueFields: $docValueFields
      ) {
        totalCount
        edges {
          node {
            _id
            lastSeen
            host {
              id
              name
              os {
                name
                version
              }
            }
          }
          cursor {
            value
          }
        }
        pageInfo {
          activePage
          fakeTotalCount
          showMorePagesIndicator
        }
        inspect @include(if: $inspect) {
          dsl
          response
        }
      }
    }
  }
`;
