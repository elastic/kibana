/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ALL_VALUE,
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  BudgetingMethod,
  HistogramIndicator,
  IndicatorType,
  KQLCustomIndicator,
  MetricCustomIndicator,
  TimeWindow,
} from '@kbn/slo-schema';
import {
  BUDGETING_METHOD_OCCURRENCES,
  BUDGETING_METHOD_TIMESLICES,
  INDICATOR_APM_AVAILABILITY,
  INDICATOR_APM_LATENCY,
  INDICATOR_CUSTOM_KQL,
  INDICATOR_CUSTOM_METRIC,
  INDICATOR_HISTOGRAM,
} from '../../utils/slo/labels';
import { CreateSLOForm } from './types';

export const SLI_OPTIONS: Array<{
  value: IndicatorType;
  text: string;
}> = [
  {
    value: 'sli.kql.custom',
    text: INDICATOR_CUSTOM_KQL,
  },
  {
    value: 'sli.metric.custom',
    text: INDICATOR_CUSTOM_METRIC,
  },
  {
    value: 'sli.histogram.custom',
    text: INDICATOR_HISTOGRAM,
  },
  {
    value: 'sli.apm.transactionDuration',
    text: INDICATOR_APM_LATENCY,
  },
  {
    value: 'sli.apm.transactionErrorRate',
    text: INDICATOR_APM_AVAILABILITY,
  },
];

export const BUDGETING_METHOD_OPTIONS: Array<{ value: BudgetingMethod; text: string }> = [
  {
    value: 'occurrences',
    text: BUDGETING_METHOD_OCCURRENCES,
  },
  {
    value: 'timeslices',
    text: BUDGETING_METHOD_TIMESLICES,
  },
];

export const TIMEWINDOW_TYPE_OPTIONS: Array<{ value: TimeWindow; text: string }> = [
  {
    value: 'rolling',
    text: i18n.translate('xpack.observability.slo.sloEdit.timeWindow.rolling', {
      defaultMessage: 'Rolling',
    }),
  },
  {
    value: 'calendarAligned',
    text: i18n.translate('xpack.observability.slo.sloEdit.timeWindow.calendarAligned', {
      defaultMessage: 'Calendar aligned',
    }),
  },
];

export const CALENDARALIGNED_TIMEWINDOW_OPTIONS = [
  {
    value: '1w',
    text: i18n.translate('xpack.observability.slo.sloEdit.calendarTimeWindow.weekly', {
      defaultMessage: 'Weekly',
    }),
  },
  {
    value: '1M',
    text: i18n.translate('xpack.observability.slo.sloEdit.calendarTimeWindow.monthly', {
      defaultMessage: 'Monthly',
    }),
  },
];

export const ROLLING_TIMEWINDOW_OPTIONS = [90, 30, 7].map((number) => ({
  value: `${number}d`,
  text: i18n.translate('xpack.observability.slo.sloEdit.rollingTimeWindow.days', {
    defaultMessage: '{number} days',
    values: { number },
  }),
}));

export const CUSTOM_KQL_DEFAULT_VALUES: KQLCustomIndicator = {
  type: 'sli.kql.custom' as const,
  params: {
    index: '',
    filter: '',
    good: '',
    total: '',
    timestampField: '',
  },
};

export const CUSTOM_METRIC_DEFAULT_VALUES: MetricCustomIndicator = {
  type: 'sli.metric.custom' as const,
  params: {
    index: '',
    filter: '',
    good: { metrics: [{ name: 'A', aggregation: 'sum' as const, field: '' }], equation: 'A' },
    total: { metrics: [{ name: 'A', aggregation: 'sum' as const, field: '' }], equation: 'A' },
    timestampField: '',
  },
};

export const HISTOGRAM_DEFAULT_VALUES: HistogramIndicator = {
  type: 'sli.histogram.custom' as const,
  params: {
    index: '',
    timestampField: '',
    filter: '',
    good: {
      field: '',
      aggregation: 'value_count' as const,
    },
    total: {
      field: '',
      aggregation: 'value_count' as const,
    },
  },
};

export const APM_LATENCY_DEFAULT_VALUES: APMTransactionDurationIndicator = {
  type: 'sli.apm.transactionDuration' as const,
  params: {
    service: '',
    environment: '',
    transactionType: '',
    transactionName: '',
    threshold: 250,
    filter: '',
    index: '',
  },
};

export const APM_AVAILABILITY_DEFAULT_VALUES: APMTransactionErrorRateIndicator = {
  type: 'sli.apm.transactionErrorRate' as const,
  params: {
    service: '',
    environment: '',
    transactionType: '',
    transactionName: '',
    filter: '',
    index: '',
  },
};

export const SLO_EDIT_FORM_DEFAULT_VALUES: CreateSLOForm = {
  name: '',
  description: '',
  indicator: CUSTOM_KQL_DEFAULT_VALUES,
  timeWindow: {
    duration: ROLLING_TIMEWINDOW_OPTIONS[1].value,
    type: 'rolling',
  },
  tags: [],
  budgetingMethod: BUDGETING_METHOD_OPTIONS[0].value,
  objective: {
    target: 99,
  },
  groupBy: ALL_VALUE,
};

export const SLO_EDIT_FORM_DEFAULT_VALUES_CUSTOM_METRIC: CreateSLOForm = {
  name: '',
  description: '',
  indicator: CUSTOM_METRIC_DEFAULT_VALUES,
  timeWindow: {
    duration: ROLLING_TIMEWINDOW_OPTIONS[1].value,
    type: 'rolling',
  },
  tags: [],
  budgetingMethod: BUDGETING_METHOD_OPTIONS[0].value,
  objective: {
    target: 99,
  },
  groupBy: ALL_VALUE,
};
