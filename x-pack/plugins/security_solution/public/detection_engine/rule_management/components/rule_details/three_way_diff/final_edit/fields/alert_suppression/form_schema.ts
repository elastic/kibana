/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ALERT_SUPPRESSION_DURATION_UNIT,
  ALERT_SUPPRESSION_DURATION_VALUE,
  ALERT_SUPPRESSION_DURATION,
  ALERT_SUPPRESSION_DURATION_TYPE,
  ALERT_SUPPRESSION_FIELDS,
} from '../../../../../../../rule_creation/components/alert_suppression_edit/fields';
import { ALERT_SUPPRESSION_MISSING_FIELDS } from '../../../../../../../rule_creation/components/alert_suppression_edit/fields';
import type {
  AlertSuppressionDurationUnit,
  AlertSuppressionMissingFieldsStrategy,
} from '../../../../../../../../../common/api/detection_engine';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../../../../../common/detection_engine/constants';
import { type FormSchema } from '../../../../../../../../shared_imports';

export interface AlertSuppressionFormData {
  [ALERT_SUPPRESSION_FIELDS]: string[];
  [ALERT_SUPPRESSION_DURATION_TYPE]: string;
  [ALERT_SUPPRESSION_DURATION]: {
    [ALERT_SUPPRESSION_DURATION_VALUE]: number;
    [ALERT_SUPPRESSION_DURATION_UNIT]: AlertSuppressionDurationUnit;
  };
  [ALERT_SUPPRESSION_MISSING_FIELDS]: AlertSuppressionMissingFieldsStrategy;
}

export const alertSuppressionFormSchema = {
  [ALERT_SUPPRESSION_MISSING_FIELDS]: {
    defaultValue: DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
  },
} as FormSchema<AlertSuppressionFormData>;
