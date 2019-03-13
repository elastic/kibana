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

  "Represents a bucket of monitor status information."
  type StatusData {
    "The timeseries point for this status data."
    x: UnsignedInteger!
    "The value of up counts for this point."
    up: Int
    "The value for down counts for this point."
    down: Int
    "The total down counts for this point."
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

  "Represents a monitor's duration performance in microseconds at a point in time."
  type MonitorDurationAreaPoint {
    "The timeseries value for this point in time."
    x: UnsignedInteger!
    "The min duration value in microseconds at this time."
    yMin: Float
    "The max duration value in microseconds at this point."
    yMax: Float
  }

  "Represents the average monitor duration ms at a point in time."
  type MonitorDurationAveragePoint {
    "The timeseries value for this point."
    x: UnsignedInteger!
    "The average duration ms for the monitor."
    y: Float
  }

  "Represents the latest recorded information about a monitor."
  type LatestMonitor {
    "The ID of the monitor represented by this data."
    id: MonitorKey!
    "Information from the latest document."
    ping: Ping
    "Buckets of recent up count status data."
    upSeries: [MonitorSeriesPoint!]
    "Buckets of recent down count status data."
    downSeries: [MonitorSeriesPoint!]
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
    name: String
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
