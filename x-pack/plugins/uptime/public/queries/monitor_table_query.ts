/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const monitorTableQueryString = `
query MonitorTable($dateRangeStart: String!, $dateRangeEnd: String!, $size: Int!, $page: String, $filters: String) {
    getMonitorTable(
      dateRangeStart: $dateRangeStart,
      dateRangeEnd: $dateRangeEnd,
      size: $size,
      page: $page,
      filters: $filters
) {
      monitorIdCount
      pages
      items {
        id {
          key
          url
        }
        ping {
          timestamp
          monitor {
            duration {
              us
            }
            id
            ip
            name
            status
          }
          url {
            full
          }
        }
        upSeries {
          x
          y
        }
        downSeries {
          x
          y
        }
      }
    }
  }

`;

export const monitorTableQuery = gql`
  ${monitorTableQueryString}
`;
