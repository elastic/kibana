/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsFieldMap840 } from '../8.4.0';

export const alertsFieldMap850 = {
  ...alertsFieldMap840,
  'user.risk.calculated_level': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'user.risk.calculated_score_norm': {
    type: 'float',
    array: false,
    required: false,
  },
  'host.risk.calculated_level': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'host.risk.calculated_score_norm': {
    type: 'float',
    array: false,
    required: false,
  },
} as const;

export type AlertsFieldMap850 = typeof alertsFieldMap850;
