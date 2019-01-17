/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const authenticationsQuery = gql`
  query GetAuthenticationsQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $pagination: PaginationInput!
    $filterQuery: String
  ) {
    source(id: $sourceId) {
      id
      Authentications(timerange: $timerange, pagination: $pagination, filterQuery: $filterQuery) {
        totalCount
        edges {
          node {
            _id
            failures
            successes
            user {
              name
            }
            source {
              ip
            }
            host {
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
