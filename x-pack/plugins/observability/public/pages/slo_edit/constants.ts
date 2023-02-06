/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BudgetingMethod, CreateSLOInput } from '@kbn/slo-schema';

export const SLI_OPTIONS = [
  {
    value: 'sli.kql.custom' as const,
    text: i18n.translate('xpack.observability.slos.sloTypes.kqlCustomIndicator', {
      defaultMessage: 'KQL custom indicator',
    }),
  },
];

export const BUDGETING_METHOD_OPTIONS: Array<{ value: BudgetingMethod; text: string }> = [
  {
    value: 'occurrences',
    text: i18n.translate('xpack.observability.slos.sloEdit.budgetingMethod.occurrences', {
      defaultMessage: 'Occurrences',
    }),
  },
  {
    value: 'timeslices',
    text: i18n.translate('xpack.observability.slos.sloEdit.budgetingMethod.timeslices', {
      defaultMessage: 'Timeslices',
    }),
  },
];

export const TIMEWINDOW_OPTIONS = [90, 30, 7].map((number) => ({
  value: `${number}d`,
  text: i18n.translate('xpack.observability.slos.sloEdit.timeWindow.days', {
    defaultMessage: '{number} days',
    values: { number },
  }),
}));

export const SLO_EDIT_FORM_DEFAULT_VALUES: CreateSLOInput = {
  name: '',
  description: '',
  indicator: {
    type: SLI_OPTIONS[0].value,
    params: {
      index: '',
      filter: '',
      good: '',
      total: '',
    },
  },
  timeWindow: {
    duration:
      TIMEWINDOW_OPTIONS[TIMEWINDOW_OPTIONS.findIndex((option) => option.value === '30d')].value,
    isRolling: true,
  },
  budgetingMethod: BUDGETING_METHOD_OPTIONS[0].value,
  objective: {
    target: 99.5,
  },
};
