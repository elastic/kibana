/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const monitorChartsQueryString = `
query MonitorCharts($dateRangeStart: String!, $dateRangeEnd: String!, $monitorId: String!) {
  monitorChartsData: getMonitorChartsData(
    monitorId: $monitorId
    dateRangeStart: $dateRangeStart
    dateRangeEnd: $dateRangeEnd
  ) {
    durationArea {
      x
      yMin
      yMax
    }
    durationLine {
      x
      y
    }
    status {
      x
      up
      down
      total
    }
    statusMaxCount
    durationMaxValue
  }
}
`;

export const monitorChartsQuery = gql`
  ${monitorChartsQueryString}
`;
