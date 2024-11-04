/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ALERT_SUPPRESSION_DURATION_UNIT,
  ALERT_SUPPRESSION_DURATION_VALUE,
} from '../../../../../../../rule_creation/components/alert_suppression_edit/fields';
import {
  ALERT_SUPPRESSION_DURATION,
  THRESHOLD_ALERT_SUPPRESSION_ENABLED,
} from '../../../../../../../rule_creation/components/alert_suppression_edit/fields';
import type { AlertSuppressionDurationUnit } from '../../../../../../../../../common/api/detection_engine';
import { type FormSchema, FIELD_TYPES } from '../../../../../../../../shared_imports';

export interface ThresholdAlertSuppressionFormData {
  [THRESHOLD_ALERT_SUPPRESSION_ENABLED]: boolean;
  [ALERT_SUPPRESSION_DURATION]: {
    [ALERT_SUPPRESSION_DURATION_VALUE]: number;
    [ALERT_SUPPRESSION_DURATION_UNIT]: AlertSuppressionDurationUnit;
  };
}

export const thresholdAlertSuppressionFormSchema = {
  [THRESHOLD_ALERT_SUPPRESSION_ENABLED]: {
    type: FIELD_TYPES.CHECKBOX,
  },
  [ALERT_SUPPRESSION_DURATION]: {
    value: {},
    unit: {},
  },
} as FormSchema<ThresholdAlertSuppressionFormData>;
