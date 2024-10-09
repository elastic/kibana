/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PickVersionValues,
  PerformRuleUpgradeRequestBody,
  AllFieldsDiff,
} from '../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import type { RuleTriad } from '../../model/rule_groups/get_rule_groups';
import { createFieldUpgradeSpecifier } from './create_field_upgrade_specifier';
import { mapDiffableRuleFieldValueToRuleSchemaFormat } from './diffable_rule_fields_mappings';
import { getFieldPredefinedValue } from './get_field_predefined_value';
import { getValueFromRuleTriad, getValueFromMergedVersion } from './get_value_from_rule_version';

interface GetValueForFieldArgs {
  fieldName: keyof PrebuiltRuleAsset;
  upgradeableRule: RuleTriad;
  globalPickVersion: PickVersionValues;
  requestBody: PerformRuleUpgradeRequestBody;
  ruleFieldsDiff: AllFieldsDiff;
}

export const getValueForField = ({
  fieldName,
  upgradeableRule,
  globalPickVersion,
  requestBody,
  ruleFieldsDiff,
}: GetValueForFieldArgs) => {
  const fieldStatus = getFieldPredefinedValue(fieldName, upgradeableRule);

  if (fieldStatus.type === 'PREDEFINED_VALUE') {
    return fieldStatus.value;
  }

  if (requestBody.mode === 'ALL_RULES') {
    return globalPickVersion === 'MERGED'
      ? getValueFromMergedVersion({
          fieldName,
          upgradeableRule,
          fieldUpgradeSpecifier: {
            pick_version: globalPickVersion,
          },
          ruleFieldsDiff,
        })
      : getValueFromRuleTriad({
          fieldName,
          upgradeableRule,
          fieldUpgradeSpecifier: {
            pick_version: globalPickVersion,
          },
        });
  }

  // Handle SPECIFIC_RULES mode
  const rule = requestBody.rules.find((r) => r.rule_id === upgradeableRule.target.rule_id);

  const fieldUpgradeSpecifier = createFieldUpgradeSpecifier({
    fieldName,
    rule,
    globalPickVersion,
    ruleId: upgradeableRule.target.rule_id,
    targetRuleType: upgradeableRule.target.type,
  });

  if (!fieldUpgradeSpecifier) {
    throw new Error(
      `Missing field upgrade specifier for field '${fieldName}' in: ${upgradeableRule.target.rule_id}`
    );
  }

  if (fieldUpgradeSpecifier.pick_version === 'RESOLVED') {
    const resolvedValue = fieldUpgradeSpecifier.resolved_value;

    return mapDiffableRuleFieldValueToRuleSchemaFormat(fieldName, resolvedValue);
  }

  return fieldUpgradeSpecifier.pick_version === 'MERGED'
    ? getValueFromMergedVersion({
        fieldName,
        upgradeableRule,
        fieldUpgradeSpecifier,
        ruleFieldsDiff,
      })
    : getValueFromRuleTriad({
        fieldName,
        upgradeableRule,
        fieldUpgradeSpecifier,
      });
};
