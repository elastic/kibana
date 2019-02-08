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

  type Snapshot {
    up: Int
    down: Int
    total: Int
    histogram: [HistogramDataPoint!]!
  }

  type DataPoint {
    x: UnsignedInteger
    y: Float
  }

  type StatusData {
    x: UnsignedInteger!
    up: Int
    down: Int
    total: Int
  }

  "The data used to populate the monitor charts."
  type MonitorChart {
    "The max and min values for the monitor duration."
    durationArea: [MonitorDurationAreaPoint!]!
    "The average values for the monitor duration."
    durationLine: [MonitorDurationAveragePoint!]!
    "The counts of up/down checks for the monitor."
    status: [StatusData!]!
    "The maximum status doc count in this chart."
    statusMaxCount: Int!
    "The maximum duration value in this chart."
    durationMaxValue: Int!
  }

  type MonitorKey {
    key: String!
    url: String
  }

  type MonitorSeriesPoint {
    x: UnsignedInteger
    y: Int
  }

  "Represents a monitor's duration performance in ms at a point in time."
  type MonitorDurationAreaPoint {
    "The timeseries value for this point."
    x: UnsignedInteger!
    "The min duration value at this point."
    y0: Float
    "The max duration value at this point."
    y: Float
  }

  "Represents the average monitor duration ms at a point in time."
  type MonitorDurationAveragePoint {
    "The timeseries value for this point."
    x: UnsignedInteger!
    "The average duration ms for the monitor."
    y: Float
  }

  type LatestMonitor {
    id: MonitorKey!
    ping: Ping
    upSeries: [MonitorSeriesPoint]
    downSeries: [MonitorSeriesPoint]
  }

  type LatestMonitorsResult {
    monitors: [LatestMonitor!]
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
    ): MonitorChart

    getLatestMonitors(dateRangeStart: String!, dateRangeEnd: String!, monitorId: String): [Ping!]!

    getFilterBar(dateRangeStart: String!, dateRangeEnd: String!): FilterBar

    getErrorsList(dateRangeStart: String!, dateRangeEnd: String!, filters: String): [ErrorListItem!]

    getMonitorPageTitle(monitorId: String!): MonitorPageTitle
  }
`;
