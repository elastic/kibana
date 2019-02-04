/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const monitorsSchema = gql`
  type FilterBar {
    ids: [MonitorKey!]
    names: [String!]
    ports: [Int!]
    schemes: [String!]
    statuses: [String!]
  }

  type HistogramDataPoint {
    upCount: Int
    downCount: Int
    x: UnsignedInteger
    x0: UnsignedInteger
    y: UnsignedInteger
  }

  type HistogramSeries {
    monitorId: String
    data: [HistogramDataPoint]
  }

  type Snapshot {
    up: Int
    down: Int
    total: Int
    histogram: [HistogramSeries]
  }

  type DataPoint {
    x: UnsignedInteger
    y: Float
  }

  type StatusData {
    x: UnsignedInteger
    up: Int
    down: Int
    total: Int
  }

  type MonitorChartEntry {
    maxContent: DataPoint
    maxResponse: DataPoint
    maxValidate: DataPoint
    maxTotal: DataPoint
    maxWriteRequest: DataPoint
    maxTcpRtt: DataPoint
    maxDuration: DataPoint
    minDuration: DataPoint
    avgDuration: DataPoint
    status: StatusData
  }

  type MonitorKey {
    key: String!
    url: String
  }

  type MonitorSeriesPoint {
    x: UnsignedInteger
    y: Int
  }

  type LatestMonitor {
    id: MonitorKey!
    ping: Ping
    upSeries: [MonitorSeriesPoint]
    downSeries: [MonitorSeriesPoint]
  }

  type LatestMonitorsResult {
    monitors: [LatestMonitor]
  }

  type ErrorListItem {
    latestMessage: String
    monitorId: String
    type: String!
    count: Int
    statusCode: String
    timestamp: String
  }

  type MonitorPageTitle {
    id: String!
    url: String
    name: String
  }

  extend type Query {
    getMonitors(
      dateRangeStart: String!
      dateRangeEnd: String!
      filters: String
    ): LatestMonitorsResult

    getSnapshot(dateRangeStart: String!, dateRangeEnd: String!, filters: String): Snapshot

    getMonitorChartsData(
      monitorId: String!
      dateRangeStart: String!
      dateRangeEnd: String!
    ): [MonitorChartEntry]

    getLatestMonitors(dateRangeStart: String!, dateRangeEnd: String!, monitorId: String): [Ping!]!

    getFilterBar(dateRangeStart: String!, dateRangeEnd: String!): FilterBar

    getErrorsList(dateRangeStart: String!, dateRangeEnd: String!, filters: String): [ErrorListItem]

    getMonitorPageTitle(monitorId: String!): MonitorPageTitle
  }
`;
