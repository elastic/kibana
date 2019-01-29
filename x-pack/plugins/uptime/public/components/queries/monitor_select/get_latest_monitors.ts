/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const getLatestMonitorsQueryString = `
query GetLatestMonitorQuery($dateRangeStart: String!, $dateRangeEnd: String!) {
  latestMonitors: getLatestMonitors(
    dateRangeStart: $dateRangeStart
    dateRangeEnd: $dateRangeEnd
  ) {
    monitor {
      status
      id
    }
  }
}
`;

export const getLatestMonitorsQuery = gql`
  ${getLatestMonitorsQueryString}
`;
