/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'src/core/types';
import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import { buildRiskScoreFromMapping } from './mappings/build_risk_score_from_mapping';
import { AlertAttributes, SignalSource } from './types';
import { buildSeverityFromMapping } from './mappings/build_severity_from_mapping';
import { buildRuleNameFromMapping } from './mappings/build_rule_name_from_mapping';
import { RuleParams } from '../schemas/rule_schemas';
import { commonParamsCamelToSnake, typeSpecificCamelToSnake } from '../schemas/rule_converters';
import { transformTags } from '../routes/rules/utils';

export const buildRuleWithoutOverrides = (ruleSO: SavedObject<AlertAttributes>): RulesSchema => {
  const ruleParams = ruleSO.attributes.params;
  return {
    id: ruleSO.id,
    actions: ruleSO.attributes.actions,
    interval: ruleSO.attributes.schedule.interval,
    name: ruleSO.attributes.name,
    tags: transformTags(ruleSO.attributes.tags),
    enabled: ruleSO.attributes.enabled,
    created_by: ruleSO.attributes.createdBy,
    updated_by: ruleSO.attributes.updatedBy,
    throttle: ruleSO.attributes.throttle,
    created_at: ruleSO.attributes.createdAt,
    updated_at: ruleSO.updated_at ?? '',
    ...commonParamsCamelToSnake(ruleParams),
    ...typeSpecificCamelToSnake(ruleParams),
  };
};

export const buildRuleWithOverrides = (
  ruleSO: SavedObject<AlertAttributes>,
  eventSource: SignalSource
): RulesSchema => {
  const ruleWithoutOverrides = buildRuleWithoutOverrides(ruleSO);
  return applyRuleOverrides(ruleWithoutOverrides, eventSource, ruleSO.attributes.params);
};

export const applyRuleOverrides = (
  rule: RulesSchema,
  eventSource: SignalSource,
  ruleParams: RuleParams
): RulesSchema => {
  const { riskScore, riskScoreMeta } = buildRiskScoreFromMapping({
    eventSource,
    riskScore: ruleParams.riskScore,
    riskScoreMapping: ruleParams.riskScoreMapping,
  });

  const { severity, severityMeta } = buildSeverityFromMapping({
    eventSource,
    severity: ruleParams.severity,
    severityMapping: ruleParams.severityMapping,
  });

  const { ruleName, ruleNameMeta } = buildRuleNameFromMapping({
    eventSource,
    ruleName: rule.name,
    ruleNameMapping: ruleParams.ruleNameOverride,
  });

  const meta = { ...ruleParams.meta, ...riskScoreMeta, ...severityMeta, ...ruleNameMeta };
  return {
    ...rule,
    risk_score: riskScore,
    risk_score_mapping: ruleParams.riskScoreMapping ?? [],
    severity,
    severity_mapping: ruleParams.severityMapping ?? [],
    name: ruleName,
    rule_name_override: ruleParams.ruleNameOverride,
    meta: Object.keys(meta).length > 0 ? meta : undefined,
  };
};
