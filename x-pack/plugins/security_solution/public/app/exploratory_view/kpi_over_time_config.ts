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
    ],
    labels: { 'host.name': 'Hosts', 'url.full': 'URL', 'agent.type': 'Agent type' },
  };
}
