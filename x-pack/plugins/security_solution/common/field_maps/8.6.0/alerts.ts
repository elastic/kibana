/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsFieldMap840 } from '../8.4.0';
import {
  ALERT_THROTTLE_VALUES,
  ALERT_THROTTLE_START,
  ALERT_THROTTLE_END,
  ALERT_THROTTLE_COUNT,
  ALERT_THROTTLE_FIELDS,
} from '../field_names';

export const alertsFieldMap860 = {
  ...alertsFieldMap840,
  [ALERT_THROTTLE_FIELDS]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [ALERT_THROTTLE_VALUES]: {
    type: 'keyword',
    array: true,
    required: false,
  },
  [ALERT_THROTTLE_START]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_THROTTLE_END]: {
    type: 'date',
    array: false,
    required: false,
  },
  [ALERT_THROTTLE_COUNT]: {
    type: 'long',
    array: false,
    required: false,
  },
} as const;

export type AlertsFieldMap860 = typeof alertsFieldMap860;
