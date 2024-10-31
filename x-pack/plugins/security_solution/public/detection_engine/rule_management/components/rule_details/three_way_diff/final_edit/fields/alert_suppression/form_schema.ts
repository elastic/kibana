/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../../../../../common/detection_engine/constants';
import { type FormSchema, FIELD_TYPES } from '../../../../../../../../shared_imports';
import * as i18n from './translations';

export interface AlertSuppressionFormData {
  groupByFields: string[];
  groupByRadioSelection: string;
  groupByDuration: {
    value: number;
    unit: string;
  };
  suppressionMissingFields: string;
}

export const alertSuppressionFormSchema = {
  groupByFields: {
    type: FIELD_TYPES.COMBO_BOX,
    helpText: i18n.ALERT_SUPPRESSION_SUPPRESS_BY_FIELD_HELP_TEXT,
  },
  groupByRadioSelection: {},
  groupByDuration: {
    value: {},
    unit: {},
  },
  suppressionMissingFields: {
    defaultValue: DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
  },
} as FormSchema<AlertSuppressionFormData>;
