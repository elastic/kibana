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
  REPORT_METRIC_FIELD,
  FILTER_RECORDS,
} from '../../../../observability/public';

export function getSecurityAlertsKPIConfig(_config: ConfigProps): SeriesConfig {
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
    breakdownFields: ['agent.type', 'event.module', 'event.category'],
    baseFilters: [],
    palette: { type: 'palette', name: 'status' },
    definitionFields: [{ field: 'kibana.alert.rule.name' }],
    metricOptions: [
      {
        label: 'Detection alerts',
        id: 'detectionAerts',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: 'NOT kibana.alert.building_block_type: *',
          },
        ],
      },
    ],
    labels: { 'host.name': 'Hosts', 'url.full': 'URL', 'agent.type': 'Agent type' },
  };
}
