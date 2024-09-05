/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleSource,
  RuleResponse,
  RuleToImport,
} from '../../../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../../../../prebuilt_rules';
import { calculateIsCustomized } from './calculate_is_customized';

export const calculateRuleSourceFromAsset = ({
  rule,
  prebuiltRuleAsset,
  ruleIdExists,
}: {
  rule: RuleResponse | RuleToImport;
  prebuiltRuleAsset: PrebuiltRuleAsset | undefined;
  ruleIdExists: boolean;
}): RuleSource => {
  if (!ruleIdExists) {
    return {
      type: 'internal',
    };
  }

  if (prebuiltRuleAsset == null) {
    return {
      type: 'external',
      is_customized: false,
    };
  }

  const isCustomized = calculateIsCustomized(prebuiltRuleAsset, rule);

  return {
    type: 'external',
    is_customized: isCustomized,
  };
};
