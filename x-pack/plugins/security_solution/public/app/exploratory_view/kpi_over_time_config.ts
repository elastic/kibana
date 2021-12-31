/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ConfigProps,
  SeriesConfig,
  ReportTypes,
  FILTER_RECORDS,
  REPORT_METRIC_FIELD,
} from '../../../../observability/public';

export function getSecurityKPIConfig(_config: ConfigProps): SeriesConfig {
  return {
    reportType: ReportTypes.KPI,
    defaultSeriesType: 'area',
    seriesTypes: [],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        operationType: 'unique_count',
      },
    ],
    hasOperationType: false,
    filterFields: [],
    breakdownFields: ['agent.type', 'event.module', 'event.dataset', 'event.category'],
    baseFilters: [],
    palette: { type: 'palette', name: 'status' },
    definitionFields: [{ field: 'host.name' }],
    metricOptions: [
      {
        label: 'Hosts',
        field: 'host.name',
        id: 'host.name',
      },
      {
        label: 'External alerts',
        id: 'EXTERNAL_ALERTS',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `event.kind: alert and host.name: * `,
          },
        ],
      },
      {
        label: 'Events',
        id: 'EVENTS',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `event: * `,
          },
        ],
      },
      {
        label: 'source ip',
        id: 'source.ip',
        field: 'source.ip',
      },
      {
        label: 'destination ip',
        id: 'destination.ip',
        field: 'destination.ip',
      },
    ],
    labels: { 'host.name': 'Hosts', 'url.full': 'URL', 'agent.type': 'Agent type' },
  };
}

export function getSecurityAuthenticationsConfig(_config: ConfigProps): SeriesConfig {
  return {
    reportType: 'event_outcome',
    defaultSeriesType: 'bar',
    seriesTypes: [],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        operationType: 'unique_count',
      },
    ],
    hasOperationType: false,
    filterFields: [],
    breakdownFields: [],
    baseFilters: [],
    palette: { type: 'palette', name: 'status' },
    definitionFields: [{ field: 'host.name' }],
    metricOptions: [
      {
        label: 'success',
        id: 'EVENT_SUCCESS',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `event.outcome: "success" and event.category: "authentication"`,
          },
        ],
      },
      {
        label: 'failure',
        id: 'EVENT_FAILURE',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `event.outcome: "failure" and event.category: "authentication"`,
          },
        ],
      },
    ],
    labels: { 'host.name': 'Hosts', 'url.full': 'URL', 'agent.type': 'Agent type' },
  };
}

export const USE_BREAK_DOWN_COLUMN = 'USE_BREAK_DOWN_COLUMN';

export function getSecurityUniqueIpsKPIConfig(_config: ConfigProps): SeriesConfig {
  return {
    defaultSeriesType: 'bar_horizontal_stacked',
    reportType: 'unique_ip',
    seriesTypes: ['bar_horizontal_stacked'],
    xAxisColumn: {
      sourceField: REPORT_METRIC_FIELD,
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        operationType: 'unique_count',
      },
    ],
    hasOperationType: false,
    filterFields: [],
    breakdownFields: [],
    baseFilters: [],
    labels: { 'host.name': 'Hosts', 'url.full': 'URL', 'agent.type': 'Agent type' },
    definitionFields: ['host.name'],
    metricOptions: [
      {
        id: 'source_ip',
        field: 'source.ip',
        label: 'Unique source IPs',
        paramFilters: [{ label: 'Src', input: { query: 'source.ip : *', language: 'kuery' } }],
      },
      {
        id: 'destination_ip',
        field: 'destination.ip',
        label: 'Unique destination IPs',
        paramFilters: [
          { label: 'Dest', input: { query: 'destination.ip : *', language: 'kuery' } },
        ],
      },
    ],
  };
}

export function getSingleMetricConfig(_config: ConfigProps): SeriesConfig {
  return {
    reportType: 'singleMetric',
    metricOptions: [
      {
        id: 'unique_host',
        field: 'host.name',
        label: 'Hosts',
      },
      {
        id: 'auth_success',
        field: 'Records_auth_success',
        label: 'Success',
        columnFilter: {
          language: 'kuery',
          query: `event.outcome: "success" and event.category: "authentication"`,
        },
      },
      {
        id: 'auth_failure',
        field: 'Records_auth_failure',
        label: 'Failure',
        columnFilter: {
          language: 'kuery',
          query: `event.outcome: "failure" and event.category: "authentication"`,
        },
      },
      {
        id: 'source_ips',
        field: 'Records_source_ips',
        label: 'Source',
        columnFilter: {
          language: 'kuery',
          query: `source.ip: *`,
        },
      },
      {
        id: 'destination_ips',
        field: 'Records_destination_ips',
        label: 'Destination',
        columnFilter: {
          language: 'kuery',
          query: `destination.ip: *`,
        },
      },
    ],
  };
}

export function getEventsKPIConfig(_config: ConfigProps): SeriesConfig {
  return {
    reportType: 'events',
    defaultSeriesType: 'bar_stacked',
    seriesTypes: [],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        operationType: 'unique_count',
        sourceField: REPORT_METRIC_FIELD,
      },
    ],
    hasOperationType: true,
    filterFields: [],
    breakdownFields: ['event.action'],
    baseFilters: [],
    palette: { type: 'palette', name: 'status' },
    definitionFields: ['event.action'],
    metricOptions: [
      {
        label: 'event.action',
        field: 'event.action',
        id: 'event.action',
      },
      {
        label: 'event.dataset',
        field: 'event.dataset',
        id: 'event.dataset',
      },
      {
        label: 'event.module',
        field: 'event.module',
        id: 'event.module',
      },
    ],
    labels: { 'host.name': 'Hosts', 'url.full': 'URL', 'agent.type': 'Agent type' },
  };
}
