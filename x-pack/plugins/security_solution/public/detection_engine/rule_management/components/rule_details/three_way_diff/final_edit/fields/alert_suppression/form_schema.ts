/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ALERT_SUPPRESSION_DURATION_UNIT_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_VALUE_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME,
  ALERT_SUPPRESSION_FIELDS_FIELD_NAME,
} from '../../../../../../../rule_creation/components/alert_suppression_edit';
import { ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME } from '../../../../../../../rule_creation/components/alert_suppression_edit';
import type {
  AlertSuppressionDurationUnit,
  AlertSuppressionMissingFieldsStrategy,
} from '../../../../../../../../../common/api/detection_engine';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../../../../../common/detection_engine/constants';
import { type FormSchema } from '../../../../../../../../shared_imports';

export interface AlertSuppressionFormData {
  [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: string[];
  [ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME]: string;
  [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: {
    [ALERT_SUPPRESSION_DURATION_VALUE_FIELD_NAME]: number;
    [ALERT_SUPPRESSION_DURATION_UNIT_FIELD_NAME]: AlertSuppressionDurationUnit;
  };
  [ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]: AlertSuppressionMissingFieldsStrategy;
}

export const alertSuppressionFormSchema = {
  [ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]: {
    defaultValue: DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
  },
} as FormSchema<AlertSuppressionFormData>;
