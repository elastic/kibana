/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CreateSLOParams } from '@kbn/slo-schema';

import {
  BUDGETING_METHOD_OPTIONS,
  TIMEWINDOW_OPTIONS,
} from './components/slo_edit_form_objectives';

export const SLI_OPTIONS = [
  {
    value: 'sli.kql.custom' as const,
    text: i18n.translate('xpack.observability.slos.sloTypes.kqlCustomIndicator', {
      defaultMessage: 'KQL custom indicator',
    }),
  },
];

export const SLO_EDIT_FORM_DEFAULT_VALUES: CreateSLOParams = {
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
    duration: TIMEWINDOW_OPTIONS[0].value as any, // Get this to be a proper Duration
    isRolling: true,
  },
  budgetingMethod: BUDGETING_METHOD_OPTIONS[0].value,
  objective: {
    target: 99.5,
  },
};
