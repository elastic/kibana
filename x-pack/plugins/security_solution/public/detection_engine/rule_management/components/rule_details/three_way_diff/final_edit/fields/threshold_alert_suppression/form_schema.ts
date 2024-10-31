/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertSuppressionDurationUnit } from '../../../../../../../../../common/api/detection_engine';
import { type FormSchema, FIELD_TYPES } from '../../../../../../../../shared_imports';

export const THRESHOLD_SUPPRESSION_ENABLED = 'suppressionFieldlessEnabled' as const;
export const SUPPRESSION_DURATION = 'suppressionDuration' as const;
export const SUPPRESSION_DURATION_VALUE = 'value' as const;
export const SUPPRESSION_DURATION_UNIT = 'unit' as const;

export interface ThresholdAlertSuppressionFormData {
  [THRESHOLD_SUPPRESSION_ENABLED]: boolean;
  [SUPPRESSION_DURATION]: {
    [SUPPRESSION_DURATION_VALUE]: number;
    [SUPPRESSION_DURATION_UNIT]: AlertSuppressionDurationUnit;
  };
}

export const thresholdAlertSuppressionFormSchema = {
  [THRESHOLD_SUPPRESSION_ENABLED]: {
    type: FIELD_TYPES.CHECKBOX,
  },
  [SUPPRESSION_DURATION]: {
    value: {},
    unit: {},
  },
} as FormSchema<ThresholdAlertSuppressionFormData>;
