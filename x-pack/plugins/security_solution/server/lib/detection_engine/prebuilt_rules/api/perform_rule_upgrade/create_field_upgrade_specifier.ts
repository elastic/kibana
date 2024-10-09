/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { assertDiffableFieldsMatchRuleType } from './assert_diffable_fields_match_rule_type';
import {
  type UpgradeSpecificRulesRequest,
  type PickVersionValues,
  type RuleSignatureId,
  type RuleFieldsToUpgrade,
  type DiffableRuleTypes,
} from '../../../../../../common/api/detection_engine';
import { type PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { mapRuleFieldToDiffableRuleField } from './diffable_rule_fields_mappings';

interface CreateFieldUpgradeSpecifierArgs {
  fieldName: keyof PrebuiltRuleAsset;
  rule?: UpgradeSpecificRulesRequest['rules'][number];
  globalPickVersion: PickVersionValues;
  ruleId: RuleSignatureId;
  targetRuleType: DiffableRuleTypes;
}

/**
 * Creates a field upgrade specifier for a given field in PrebuiltRuleAsset.
 *
 * This function determines how a specific field should be upgraded based on the
 * upgrade request body and the pick_version at global, rule and field-levels,
 * when the mode is SPECIFIC_RULES.
 */
export const createFieldUpgradeSpecifier = ({
  fieldName,
  rule,
  globalPickVersion,
  ruleId,
  targetRuleType,
}: CreateFieldUpgradeSpecifierArgs) => {
  if (!rule) {
    throw new Error(`Rule payload for upgradable rule ${ruleId} not found`);
  }

  if (!rule.fields || Object.keys(rule.fields).length === 0) {
    return {
      fieldName,
      pick_version: rule.pick_version ?? globalPickVersion,
    };
  }

  assertDiffableFieldsMatchRuleType(Object.keys(rule.fields), targetRuleType);

  const fieldsToUpgradePayload = rule.fields as Record<
    string,
    RuleFieldsToUpgrade[keyof RuleFieldsToUpgrade]
  >;

  const fieldGroup = mapRuleFieldToDiffableRuleField({
    ruleType: targetRuleType,
    fieldName,
  });

  const fieldUpgradeSpecifier = fieldsToUpgradePayload[fieldGroup];

  if (fieldUpgradeSpecifier?.pick_version === 'RESOLVED') {
    return {
      fieldName,
      pick_version: fieldUpgradeSpecifier.pick_version,
      resolved_value: fieldUpgradeSpecifier.resolved_value,
    };
  }

  return {
    fieldName,
    pick_version:
      // If there's no matching specific field upgrade specifier in the payload,
      // we fallback to a rule level pick_version. Since this is also optional,
      // we default to the global pick_version.
      fieldUpgradeSpecifier?.pick_version ?? rule.pick_version ?? globalPickVersion,
  };
};
