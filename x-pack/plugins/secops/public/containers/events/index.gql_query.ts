/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const eventsQuery = gql`
  query GetEventsQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $pagination: PaginationInput!
    $sortField: SortField!
    $filterQuery: String
  ) {
    source(id: $sourceId) {
      id
      Events(
        timerange: $timerange
        pagination: $pagination
        sortField: $sortField
        filterQuery: $filterQuery
      ) {
        totalCount
        pageInfo {
          endCursor {
            value
            tiebreaker
          }
          hasNextPage
        }
        edges {
          node {
            _id
            _index
            timestamp
            event {
              action
              severity
              module
              category
              id
            }
            host {
              name
              ip
              id
            }
            source {
              ip
              port
            }
            destination {
              ip
              port
            }
            geo {
              region_name
              country_iso_code
            }
            suricata {
              eve {
                proto
                flow_id
                alert {
                  signature
                  signature_id
                }
              }
            }
            zeek {
              session_id
            }
          }
        }
      }
    }
  }
`;
