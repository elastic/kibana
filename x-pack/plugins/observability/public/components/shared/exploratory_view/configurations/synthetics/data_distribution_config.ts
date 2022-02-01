/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProps, SeriesConfig } from '../../types';
import {
  FieldLabels,
  REPORT_METRIC_FIELD,
  RECORDS_PERCENTAGE_FIELD,
  ReportTypes,
} from '../constants';
import {
  CLS_LABEL,
  DCL_LABEL,
  DOCUMENT_ONLOAD_LABEL,
  FCP_LABEL,
  LCP_LABEL,
  MONITORS_DURATION_LABEL,
  PINGS_LABEL,
} from '../constants/labels';
import {
  MONITOR_DURATION_US,
  SYNTHETICS_CLS,
  SYNTHETICS_DCL,
  SYNTHETICS_DOCUMENT_ONLOAD,
  SYNTHETICS_FCP,
  SYNTHETICS_LCP,
} from '../constants/field_names/synthetics';
import { buildExistsFilter } from '../utils';

export function getSyntheticsDistributionConfig({ series, dataView }: ConfigProps): SeriesConfig {
  return {
    reportType: ReportTypes.DISTRIBUTION,
    defaultSeriesType: series?.seriesType || 'line',
    seriesTypes: [],
    xAxisColumn: {
      sourceField: REPORT_METRIC_FIELD,
    },
    yAxisColumns: [
      {
        sourceField: RECORDS_PERCENTAGE_FIELD,
        label: PINGS_LABEL,
      },
    ],
    hasOperationType: false,
    filterFields: ['monitor.type', 'observer.geo.name', 'tags'],
    breakdownFields: [
      'observer.geo.name',
      'monitor.name',
      'monitor.id',
      'monitor.type',
      'tags',
      'url.port',
    ],
    baseFilters: [],
    definitionFields: [
      { field: 'monitor.name', nested: 'synthetics.step.name.keyword', singleSelection: true },
      { field: 'url.full', filters: buildExistsFilter('summary.up', dataView) },
    ],
    metricOptions: [
      {
        label: MONITORS_DURATION_LABEL,
        id: MONITOR_DURATION_US,
        field: MONITOR_DURATION_US,
      },
      {
        label: LCP_LABEL,
        field: SYNTHETICS_LCP,
        id: SYNTHETICS_LCP,
      },
      {
        label: FCP_LABEL,
        field: SYNTHETICS_FCP,
        id: SYNTHETICS_FCP,
      },
      {
        label: DCL_LABEL,
        field: SYNTHETICS_DCL,
        id: SYNTHETICS_DCL,
      },
      {
        label: DOCUMENT_ONLOAD_LABEL,
        field: SYNTHETICS_DOCUMENT_ONLOAD,
        id: SYNTHETICS_DOCUMENT_ONLOAD,
      },
      {
        label: CLS_LABEL,
        field: SYNTHETICS_CLS,
        id: SYNTHETICS_CLS,
      },
    ],
    labels: { ...FieldLabels, 'monitor.duration.us': MONITORS_DURATION_LABEL },
  };
}
