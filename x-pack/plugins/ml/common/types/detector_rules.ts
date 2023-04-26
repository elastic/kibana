/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ML_DETECTUR_RULE_ACTION,
  ML_DETECTUR_RULE_FILTER_TYPE,
  ML_DETECTUR_RULE_APPLIES_TO,
  ML_DETECTUR_RULE_OPERATOR,
} from '@kbn/ml-anomaly-utils';

export interface DetectorRuleScope {
  [id: string]: {
    filter_id: string;
    filter_type: ML_DETECTUR_RULE_FILTER_TYPE;
  };
}

export interface DetectorRuleCondition {
  applies_to: ML_DETECTUR_RULE_APPLIES_TO;
  operator: ML_DETECTUR_RULE_OPERATOR;
  value: number;
}

export interface DetectorRule {
  actions: ML_DETECTUR_RULE_ACTION[];
  scope?: DetectorRuleScope;
  conditions?: DetectorRuleCondition[];
}
