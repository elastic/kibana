/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleSource,
  RuleResponse,
  PrebuiltRuleToImport,
} from '../../../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../../../../prebuilt_rules';
import { calculateIsCustomized } from './calculate_is_customized';

export const calculateRuleSourceFromAsset = ({
  rule,
  assetWithMatchingVersion,
  ruleIdExists,
}: {
  rule: RuleResponse | PrebuiltRuleToImport;
  assetWithMatchingVersion: PrebuiltRuleAsset | undefined;
  ruleIdExists: boolean;
}): RuleSource => {
  // No assetWithMatchingVersion found with same rule_id
  if (!ruleIdExists) {
    return {
      type: 'internal',
    };
  }

  // PrebuiltRuleAsset was found with same rule_id, but different version
  if (assetWithMatchingVersion == null) {
    return {
      type: 'external',
      is_customized: true, // changed here from false to true, differs from RFC
    };
  }

  // assetWithMatchingVersion with matching rule_id and version found
  const isCustomized = calculateIsCustomized(assetWithMatchingVersion, rule);

  return {
    type: 'external',
    is_customized: isCustomized,
  };
};
