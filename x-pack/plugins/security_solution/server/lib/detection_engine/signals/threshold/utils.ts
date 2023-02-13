/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import type { CompleteRule, ThresholdRuleParams } from '../../rule_schema';
import type {
  ThresholdNormalized,
  ThresholdWithCardinality,
} from '../../../../../common/detection_engine/rule_schema';

export const shouldFilterByCardinality = (
  threshold: ThresholdNormalized
): threshold is ThresholdWithCardinality => !!threshold.cardinality?.length;

export const getRuleEssentialsHash = (completeRule: CompleteRule<ThresholdRuleParams>) => {
  const ruleParams = completeRule.ruleParams;
  const ruleEssentials = {
    dataViewId: ruleParams.dataViewId,
    exceptionsList: ruleParams.exceptionsList,
    filters: ruleParams.filters,
    index: ruleParams.index?.sort(),
    query: ruleParams.query,
    from: ruleParams.from,
    to: ruleParams.to,
    thresholdField: ruleParams.threshold.field.sort(),
    thresholdCardinalityField: ruleParams.threshold.cardinality?.map((val) => val.field).sort(),
  };
  const ruleEssentialsHash = createHash('sha256')
    .update(JSON.stringify(ruleEssentials))
    .digest('hex');
  return ruleEssentialsHash;
};
