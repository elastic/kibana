/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const getPingsQuery = gql`
  query PingList(
    $dateRangeStart: UnsignedInteger!
    $dateRangeEnd: UnsignedInteger!
    $monitorId: String
    $status: String
    $sort: String
    $size: Int
  ) {
    allPings(
      dateRangeStart: $dateRangeStart
      dateRangeEnd: $dateRangeEnd
      monitorId: $monitorId
      status: $status
      sort: $sort
      size: $size
    ) {
      total
      pings {
        timestamp
        http {
          response {
            status_code
          }
        }
        error {
          message
          type
        }
        monitor {
          duration {
            us
          }
          id
          ip
          name
          scheme
          status
          type
        }
      }
    }
  }
`;
