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
            query: `event.outcome: success`,
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
            query: `event.outcome: failure`,
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
const statusPallete = euiPaletteForStatus(3);
export function getSecurityEventOutcomeKPIConfig(_config: ConfigProps): SeriesConfig {
  return {
    defaultSeriesType: 'bar_horizontal_percentage_stacked',
    reportType: 'event_outcome',
    seriesTypes: ['bar_horizontal_percentage_stacked'],
    xAxisColumn: {
      sourceField: USE_BREAK_DOWN_COLUMN,
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        label: 'success',
      },
      {
        sourceField: REPORT_METRIC_FIELD,
        label: 'failure',
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
        id: 'even_outcome',
        label: 'event outcome',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `event.outcome: success`,
          },
          {
            language: 'kuery',
            query: `event.outcome: failure`,
          },
        ],
      },
    ],
    yConfig: [
      { color: statusPallete[0], forAccessor: 'y-axis-column' },
      { color: statusPallete[1], forAccessor: 'y-axis-column-1' },
      { color: statusPallete[2], forAccessor: 'y-axis-column-2' },
    ],
  };
}

export function getSecurityUniqueIpscomeKPIConfig(_config: ConfigProps): SeriesConfig {
  return {
    defaultSeriesType: 'bar_horizontal_percentage_stacked',
    reportType: 'unique_ip',
    seriesTypes: ['bar_horizontal_percentage_stacked'],
    xAxisColumn: {
      sourceField: USE_BREAK_DOWN_COLUMN,
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        label: 'src',
      },
      {
        sourceField: REPORT_METRIC_FIELD,
        label: 'dest',
      },
    ],
    hasOperationType: false,
    filterFields: [],
    breakdownFields: ['source.ip', 'destination.ip'],
    baseFilters: [],
    labels: { 'host.name': 'Hosts', 'url.full': 'URL', 'agent.type': 'Agent type' },
    definitionFields: ['host.name'],
    metricOptions: [
      {
        id: 'unique_ip',
        label: 'unique ip',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `source.ip: *`,
          },
          {
            language: 'kuery',
            query: `destination.ip: *`,
          },
        ],
      },
    ],
    yConfig: [
      { color: statusPallete[0], forAccessor: 'y-axis-column' },
      { color: statusPallete[1], forAccessor: 'y-axis-column-1' },
      { color: statusPallete[2], forAccessor: 'y-axis-column-2' },
    ],
  };
}
