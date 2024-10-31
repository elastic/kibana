/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertSuppressionDurationUnit,
  AlertSuppressionMissingFieldsStrategy,
} from '../../../../../../../../../common/api/detection_engine';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../../../../../common/detection_engine/constants';
import { type FormSchema, FIELD_TYPES } from '../../../../../../../../shared_imports';
import * as i18n from './translations';

export const SUPPRESSION_FIELDS = 'suppressionFields' as const;
export const SUPPRESSION_DURATION_SELECTOR = 'suppressionDurationSelector' as const;
export const SUPPRESSION_DURATION = 'suppressionDuration' as const;
export const SUPPRESSION_DURATION_VALUE = 'value' as const;
export const SUPPRESSION_DURATION_UNIT = 'unit' as const;
export const SUPPRESSION_MISSING_FIELDS = 'suppressionMissingFields' as const;

export interface AlertSuppressionFormData {
  [SUPPRESSION_FIELDS]: string[];
  [SUPPRESSION_DURATION_SELECTOR]: string;
  [SUPPRESSION_DURATION]: {
    [SUPPRESSION_DURATION_VALUE]: number;
    [SUPPRESSION_DURATION_UNIT]: AlertSuppressionDurationUnit;
  };
  [SUPPRESSION_MISSING_FIELDS]: AlertSuppressionMissingFieldsStrategy;
}

export const alertSuppressionFormSchema = {
  [SUPPRESSION_FIELDS]: {
    type: FIELD_TYPES.COMBO_BOX,
    helpText: i18n.ALERT_SUPPRESSION_SUPPRESS_BY_FIELD_HELP_TEXT,
  },
  [SUPPRESSION_DURATION_SELECTOR]: {},
  [SUPPRESSION_DURATION]: {
    value: {},
    unit: {},
  },
  [SUPPRESSION_MISSING_FIELDS]: {
    defaultValue: DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
  },
} as FormSchema<AlertSuppressionFormData>;
