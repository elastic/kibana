/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
} from '../../../../../common/constants';

export const ruleTypeMappings = {
  eql: EQL_RULE_TYPE_ID,
  machine_learning: ML_RULE_TYPE_ID,
  query: QUERY_RULE_TYPE_ID,
  saved_query: SAVED_QUERY_RULE_TYPE_ID,
  threat_match: INDICATOR_RULE_TYPE_ID,
  threshold: THRESHOLD_RULE_TYPE_ID,
};
