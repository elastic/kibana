/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const monitorsSchema = gql`
  type MonitorKey {
    id: String
    port: Int
  }

  type MonitorSeriesPoint {
    x: UnsignedInteger
    y: Int
  }

  type LatestMonitor {
    key: MonitorKey
    ping: Ping
    upSeries: [MonitorSeriesPoint]
    downSeries: [MonitorSeriesPoint]
  }

  type LatestMonitorsResult {
    monitors: [LatestMonitor]
  }

  extend type Query {
    getMonitors(start: UnsignedInteger, end: UnsignedInteger): LatestMonitorsResult
  }
`;
