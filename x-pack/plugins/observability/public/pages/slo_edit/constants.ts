/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateSLOParams } from '@kbn/slo-schema';

import { SLI_OPTIONS } from './components/slo_edit_form';
import {
  BUDGETING_METHOD_OPTIONS,
  TIMEWINDOW_OPTIONS,
} from './components/slo_edit_form_objectives';

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
    duration: TIMEWINDOW_OPTIONS[0].value,
    isRolling: true,
  },
  budgetingMethod: BUDGETING_METHOD_OPTIONS[0].value,
  objective: {
    target: 0,
  },
};
