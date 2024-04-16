/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsFieldMap840 } from '../8.4.0';
import {
  ALERT_HOST_CRITICALITY,
  ALERT_USER_CRITICALITY,
  LEGACY_ALERT_HOST_CRITICALITY,
  LEGACY_ALERT_USER_CRITICALITY,
  ALERT_RULE_RULE_PARENT_ID,
  ALERT_RULE_RULE_CHILDREN_IDS,
} from '../field_names';

export const alertsFieldMap8130 = {
  ...alertsFieldMap840,
  [LEGACY_ALERT_HOST_CRITICALITY]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [LEGACY_ALERT_USER_CRITICALITY]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  /**
   * Stores the criticality level for the host, as determined by analysts, in relation to the alert.
   * The Criticality level is copied from the asset criticality index.
   */
  [ALERT_HOST_CRITICALITY]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  /**
   * Stores the criticality level for the user, as determined by analysts, in relation to the alert.
   * The Criticality level is copied from the asset criticality index.
   */
  [ALERT_USER_CRITICALITY]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  /**
   * Stores the criticality level for the user, as determined by analysts, in relation to the alert.
   * The Criticality level is copied from the asset criticality index.
   */
  [ALERT_RULE_RULE_PARENT_ID]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  /**
   * Stores the criticality level for the user, as determined by analysts, in relation to the alert.
   * The Criticality level is copied from the asset criticality index.
   */
  [ALERT_RULE_RULE_CHILDREN_IDS]: {
    type: 'keyword',
    array: true,
    required: false,
  },
} as const;

export type AlertsFieldMap8130 = typeof alertsFieldMap8130;
