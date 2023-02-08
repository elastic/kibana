/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertFieldMap, legacyAlertFieldMap } from '@kbn/alerting-plugin/common';
import { pickWithPatterns } from '../../pick_with_patterns';
import * as Fields from '../../technical_rule_data_field_names';

export const technicalRuleFieldMap = {
  ...pickWithPatterns(alertFieldMap, '*'),
  ...pickWithPatterns(legacyAlertFieldMap, '*'),
  // TODO - are we able to change this
  [Fields.ALERT_RULE_PARAMETERS]: { type: 'flattened', ignore_above: 4096, required: false },
} as const;

export type TechnicalRuleFieldMap = typeof technicalRuleFieldMap;
