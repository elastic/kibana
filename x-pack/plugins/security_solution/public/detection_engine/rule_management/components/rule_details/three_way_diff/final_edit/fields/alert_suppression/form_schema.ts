/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SUPPRESSION_DURATION_UNIT,
  SUPPRESSION_DURATION_VALUE,
  SUPPRESSION_DURATION,
  SUPPRESSION_DURATION_SELECTOR,
  SUPPRESSION_FIELDS,
} from '../../../../../../../rule_creation/components/alert_suppression_edit/fields';
import { SUPPRESSION_MISSING_FIELDS } from '../../../../../../../rule_creation/components/alert_suppression_edit/fields';
import type {
  AlertSuppressionDurationUnit,
  AlertSuppressionMissingFieldsStrategy,
} from '../../../../../../../../../common/api/detection_engine';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../../../../../common/detection_engine/constants';
import { type FormSchema } from '../../../../../../../../shared_imports';

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
  [SUPPRESSION_MISSING_FIELDS]: {
    defaultValue: DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
  },
} as FormSchema<AlertSuppressionFormData>;
