/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Fields from '../../technical_rule_data_field_names';

export const experimentalRuleFieldMap = {
  [Fields.ALERT_EVALUATION_THRESHOLD]: {
    type: 'scaled_float',
    scaling_factor: 100,
    required: false,
  },
  [Fields.ALERT_EVALUATION_VALUE]: { type: 'scaled_float', scaling_factor: 100, required: false },
} as const;

export type ExperimentalRuleFieldMap = typeof experimentalRuleFieldMap;
