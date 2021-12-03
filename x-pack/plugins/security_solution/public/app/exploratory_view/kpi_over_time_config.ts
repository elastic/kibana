/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { euiPaletteForStatus } from '@elastic/eui';
import {
  ConfigProps,
  SeriesConfig,
  ReportTypes,
  FILTER_RECORDS,
  REPORT_METRIC_FIELD,
  RECORDS_FIELD,
  UNIQUE_COUNT_COLUMN,
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
        label: 'User authentication success',
        id: 'EVENT_SUCCESS',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `event.outcome: success and event.category: "authentication"`,
          },
        ],
      },
      {
        label: 'User authentication failure',
        id: 'EVENT_FAILURE',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `event.outcome: failure and event.category: "authentication"`,
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
export const USE_BREAK_DOWN_COLUMN = 'USE_BREAK_DOWN_COLUMN';
const statusPallet = euiPaletteForStatus(2);

export function getSecurityEventOutcomeKPIConfig(_config: ConfigProps): SeriesConfig {
  return {
    defaultSeriesType: 'bar_horizontal_stacked',
    reportType: 'event_outcome',
    seriesTypes: ['bar_horizontal_stacked'],
    xAxisColumn: {
      sourceField: REPORT_METRIC_FIELD,
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
      },
    ],
    hasOperationType: false,
    filterFields: [],
    breakdownFields: ['event.outcome'],
    baseFilters: [],
    labels: { 'host.name': 'Hosts', 'url.full': 'URL', 'agent.type': 'Agent type' },
    definitionFields: ['host.name'],
    metricOptions: [
      {
        id: 'even_outcome_success',
        label: 'authenticationsSuccess',
        columnType: FILTER_RECORDS,
        paramFilters: [
          { label: 'Succ', input: { query: 'event.outcome: success', language: 'kuery' } },
        ],
        columnFilters: [
          {
            language: 'kuery',
            query: `event.outcome: success`,
          },
        ],
      },
      {
        id: 'even_outcome_failure',
        label: 'authenticationsFailure',
        columnType: FILTER_RECORDS,
        paramFilters: [
          { label: 'Fail', input: { query: 'event.outcome: failure', language: 'kuery' } },
        ],
        columnFilters: [
          {
            language: 'kuery',
            query: `event.outcome: failure`,
          },
        ],
      },
    ],
    yConfig: [
      { color: statusPallet[0], forAccessor: 'y-axis-column' },
      { color: statusPallet[1], forAccessor: 'y-axis-column-1' },
    ],
    query: {
      language: 'kuery',
      query:
        '(event.outcome: "success" or event.outcome : "failure") and event.category: "authentication"',
    },
  };
}

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
