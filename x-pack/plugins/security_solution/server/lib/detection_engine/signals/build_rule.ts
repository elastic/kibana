/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import { buildRiskScoreFromMapping } from './mappings/build_risk_score_from_mapping';
import { SignalSource } from './types';
import { buildSeverityFromMapping } from './mappings/build_severity_from_mapping';
import { buildRuleNameFromMapping } from './mappings/build_rule_name_from_mapping';
import { CompleteRule, RuleParams } from '../schemas/rule_schemas';
import { commonParamsCamelToSnake, typeSpecificCamelToSnake } from '../schemas/rule_converters';
import { transformTags } from '../routes/rules/utils';
import { transformAlertToRuleAction } from '../../../../common/detection_engine/transform_actions';

export const buildRuleWithoutOverrides = (completeRule: CompleteRule<RuleParams>): RulesSchema => {
  const ruleParams = completeRule.ruleParams;
  const {
    actions,
    schedule,
    name,
    tags,
    enabled,
    createdBy,
    updatedBy,
    throttle,
    createdAt,
    updatedAt,
  } = completeRule.ruleConfig;
  return {
    actions: actions.map(transformAlertToRuleAction),
    created_at: createdAt.toISOString(),
    created_by: createdBy ?? '',
    enabled,
    id: completeRule.alertId,
    interval: schedule.interval,
    name,
    tags: transformTags(tags),
    throttle: throttle ?? undefined,
    updated_at: updatedAt.toISOString(),
    updated_by: updatedBy ?? '',
    ...commonParamsCamelToSnake(ruleParams),
    ...typeSpecificCamelToSnake(ruleParams),
  };
};

export const buildRuleWithOverrides = (
  completeRule: CompleteRule<RuleParams>,
  eventSource: SignalSource
): RulesSchema => {
  const ruleWithoutOverrides = buildRuleWithoutOverrides(completeRule);
  return applyRuleOverrides(ruleWithoutOverrides, eventSource, completeRule.ruleParams);
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
