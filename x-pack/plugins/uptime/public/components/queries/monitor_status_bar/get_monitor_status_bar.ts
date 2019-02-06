/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const getMonitorStatusBarQueryString = `
query MonitorStatus($dateRangeStart: String!, $dateRangeEnd: String!, $monitorId: String) {
  monitorStatus: getLatestMonitors(
    dateRangeStart: $dateRangeStart
    dateRangeEnd: $dateRangeEnd
    monitorId: $monitorId
  ) {
    timestamp
    millisFromNow
    monitor {
      status
      duration {
        us
      }
    }
    url {
      full
    }
  }
}
`;

export const getMonitorStatusBarQuery = gql`
  ${getMonitorStatusBarQueryString}
`;
