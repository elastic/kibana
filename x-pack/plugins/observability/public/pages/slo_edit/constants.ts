/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BudgetingMethod, CreateSLOInput } from '@kbn/slo-schema';
import {
  BUDGETING_METHOD_OCCURRENCES,
  BUDGETING_METHOD_TIMESLICES,
  INDICATOR_APM_AVAILABILITY,
  INDICATOR_APM_LATENCY,
  INDICATOR_CUSTOM_KQL,
  INDICATOR_CUSTOM_METRIC,
} from '../../utils/slo/labels';

export const SLI_OPTIONS: Array<{
  value: CreateSLOInput['indicator']['type'];
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

export const TIMEWINDOW_OPTIONS = [90, 30, 7].map((number) => ({
  value: `${number}d`,
  text: i18n.translate('xpack.observability.slo.sloEdit.timeWindow.days', {
    defaultMessage: '{number} days',
    values: { number },
  }),
}));

export const SLO_EDIT_FORM_DEFAULT_VALUES: CreateSLOInput = {
  name: '',
  description: '',
  indicator: {
    type: 'sli.kql.custom',
    params: {
      index: '',
      filter: '',
      good: '',
      total: '',
      timestampField: '',
    },
  },
  timeWindow: {
    duration:
      TIMEWINDOW_OPTIONS[TIMEWINDOW_OPTIONS.findIndex((option) => option.value === '30d')].value,
    isRolling: true,
  },
  tags: [],
  budgetingMethod: BUDGETING_METHOD_OPTIONS[0].value,
  objective: {
    target: 99,
  },
};

export const SLO_EDIT_FORM_DEFAULT_VALUES_CUSTOM_METRIC: CreateSLOInput = {
  name: '',
  description: '',
  indicator: {
    type: 'sli.metric.custom',
    params: {
      index: '',
      filter: '',
      good: { metrics: [{ name: 'A', aggregation: 'sum', field: '' }], equation: 'A' },
      total: { metrics: [{ name: 'A', aggregation: 'sum', field: '' }], equation: 'A' },
      timestampField: '',
    },
  },
  timeWindow: {
    duration:
      TIMEWINDOW_OPTIONS[TIMEWINDOW_OPTIONS.findIndex((option) => option.value === '30d')].value,
    isRolling: true,
  },
  tags: [],
  budgetingMethod: BUDGETING_METHOD_OPTIONS[0].value,
  objective: {
    target: 99,
  },
};
