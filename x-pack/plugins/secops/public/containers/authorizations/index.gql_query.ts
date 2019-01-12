/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const authorizationsQuery = gql`
  query GetAuthorizationsQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $pagination: PaginationInput!
    $filterQuery: String
  ) {
    source(id: $sourceId) {
      id
      Authorizations(timerange: $timerange, pagination: $pagination, filterQuery: $filterQuery) {
        totalCount
        edges {
          authorization {
            _id
            failures
            successes
            user
            from
            to {
              id
              name
            }
            latest
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
