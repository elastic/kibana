/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleResponse,
  RuleUpdateProps,
} from '../../../../../../../common/api/detection_engine/model/rule_schema';
import { DEFAULT_MAX_SIGNALS } from '../../../../../../../common/constants';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { addEcsToRequiredFields } from '../../../utils/utils';
import { setTypeSpecificDefaults } from './apply_rule_defaults';
import { calculateRuleSource } from './rule_source/calculate_rule_source';

interface ApplyRuleUpdateProps {
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  existingRule: RuleResponse;
  ruleUpdate: RuleUpdateProps;
}

export const applyRuleUpdate = async ({
  prebuiltRuleAssetClient,
  existingRule,
  ruleUpdate,
}: ApplyRuleUpdateProps): Promise<RuleResponse> => {
  const typeSpecificProps = setTypeSpecificDefaults(ruleUpdate);

  const nextRule: RuleResponse = {
    // Keep existing values for these fields
    id: existingRule.id,
    rule_id: existingRule.rule_id,
    revision: existingRule.revision,
    immutable: existingRule.immutable,
    rule_source: existingRule.rule_source,
    updated_at: existingRule.updated_at,
    updated_by: existingRule.updated_by,
    created_at: existingRule.created_at,
    created_by: existingRule.created_by,

    // Update values for these fields
    enabled: ruleUpdate.enabled ?? existingRule.enabled,
    name: ruleUpdate.name,
    description: ruleUpdate.description,
    tags: ruleUpdate.tags ?? [],
    author: ruleUpdate.author ?? [],
    building_block_type: ruleUpdate.building_block_type,
    false_positives: ruleUpdate.false_positives ?? [],
    from: ruleUpdate.from ?? 'now-6m',
    investigation_fields: ruleUpdate.investigation_fields,
    license: ruleUpdate.license,
    output_index: ruleUpdate.output_index ?? '',
    timeline_id: ruleUpdate.timeline_id,
    timeline_title: ruleUpdate.timeline_title,
    meta: ruleUpdate.meta,
    max_signals: ruleUpdate.max_signals ?? DEFAULT_MAX_SIGNALS,
    related_integrations: ruleUpdate.related_integrations ?? [],
    required_fields: addEcsToRequiredFields(ruleUpdate.required_fields),
    risk_score: ruleUpdate.risk_score,
    risk_score_mapping: ruleUpdate.risk_score_mapping ?? [],
    rule_name_override: ruleUpdate.rule_name_override,
    setup: ruleUpdate.setup ?? '',
    severity: ruleUpdate.severity,
    severity_mapping: ruleUpdate.severity_mapping ?? [],
    threat: ruleUpdate.threat ?? [],
    timestamp_override: ruleUpdate.timestamp_override,
    timestamp_override_fallback_disabled: ruleUpdate.timestamp_override_fallback_disabled,
    to: ruleUpdate.to ?? 'now',
    references: ruleUpdate.references ?? [],
    namespace: ruleUpdate.namespace,
    note: ruleUpdate.note,
    version: ruleUpdate.version ?? existingRule.version,
    exceptions_list: ruleUpdate.exceptions_list ?? [],
    interval: ruleUpdate.interval ?? '5m',
    throttle: ruleUpdate.throttle ?? undefined,
    actions: ruleUpdate.actions ?? [],
    ...typeSpecificProps,
  };

  nextRule.rule_source = await calculateRuleSource({
    existingRule,
    nextRule,
    prebuiltRuleAssetClient,
  });

  return nextRule;
};
