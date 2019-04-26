/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const monitorCountQueryString = `
query MonitorCount($dateRangeStart: String!, $dateRangeEnd: String!, $filters: String) {
  monitorCount: getMonitorCount(dateRangeStart: $dateRangeStart, dateRangeEnd: $dateRangeEnd, filters: $filters)
}
`;

export const monitorCountQuery = gql`
  ${monitorCountQueryString}
`;
