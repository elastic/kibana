/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ACTION, FILTER_TYPE, APPLIES_TO, OPERATOR } from '../constants/detector_rule';

export interface DetectorRuleScope {
  [id: string]: {
    filter_id: string;
    filter_type: FILTER_TYPE;
  };
}

export interface DetectorRuleCondition {
  applies_to: APPLIES_TO;
  operator: OPERATOR;
  value: number;
}

export interface DetectorRule {
  actions: ACTION[];
  scope?: DetectorRuleScope;
  conditions?: DetectorRuleCondition[];
}
