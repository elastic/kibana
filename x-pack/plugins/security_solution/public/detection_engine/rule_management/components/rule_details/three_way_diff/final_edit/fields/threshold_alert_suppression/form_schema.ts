/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { THRESHOLD_ALERT_SUPPRESSION_ENABLED } from '../../../../../../../rule_creation/components/threshold_alert_suppression_edit';
import type {
  ALERT_SUPPRESSION_DURATION_UNIT_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_VALUE_FIELD_NAME,
} from '../../../../../../../rule_creation/components/alert_suppression_edit';
import { ALERT_SUPPRESSION_DURATION_FIELD_NAME } from '../../../../../../../rule_creation/components/alert_suppression_edit';
import type { AlertSuppressionDurationUnit } from '../../../../../../../../../common/api/detection_engine';
import { type FormSchema, FIELD_TYPES } from '../../../../../../../../shared_imports';

export interface ThresholdAlertSuppressionFormData {
  [THRESHOLD_ALERT_SUPPRESSION_ENABLED]: boolean;
  [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: {
    [ALERT_SUPPRESSION_DURATION_VALUE_FIELD_NAME]: number;
    [ALERT_SUPPRESSION_DURATION_UNIT_FIELD_NAME]: AlertSuppressionDurationUnit;
  };
}

export const thresholdAlertSuppressionFormSchema = {
  [THRESHOLD_ALERT_SUPPRESSION_ENABLED]: {
    type: FIELD_TYPES.CHECKBOX,
  },
  [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: {
    value: {},
    unit: {},
  },
} as FormSchema<ThresholdAlertSuppressionFormData>;
