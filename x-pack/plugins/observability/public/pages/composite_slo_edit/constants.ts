/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BudgetingMethod, CompositeMethod, CreateCompositeSLOInput } from '@kbn/slo-schema';
import {
  BUDGETING_METHOD_OCCURRENCES,
  BUDGETING_METHOD_TIMESLICES,
  COMPOSITE_METHOD_WEIGHTED_AVERAGE,
} from '../../utils/slo/labels';

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

export const COMPOSITE_METHOD_OPTIONS: Array<{ value: CompositeMethod; text: string }> = [
  { value: 'weightedAverage', text: COMPOSITE_METHOD_WEIGHTED_AVERAGE },
];

export const TIMEWINDOW_OPTIONS = [90, 30, 7].map((number) => ({
  value: `${number}d`,
  text: i18n.translate('xpack.observability.slo.sloEdit.timeWindow.days', {
    defaultMessage: '{number} days',
    values: { number },
  }),
}));

export const COMPOSITE_SLO_FORM_DEFAULT_VALUES: CreateCompositeSLOInput = {
  name: '',
  sources: [{ id: '', revision: 1, weight: 1 }],
  timeWindow: {
    duration:
      TIMEWINDOW_OPTIONS[TIMEWINDOW_OPTIONS.findIndex((option) => option.value === '30d')].value,
    type: 'rolling',
  },
  tags: [],
  budgetingMethod: BUDGETING_METHOD_OPTIONS[0].value,
  compositeMethod: 'weightedAverage',
  objective: {
    target: 99,
  },
};
