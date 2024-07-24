/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedSanitizedRule, SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RequiredOptional } from '@kbn/zod-helpers';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import {
  transformAlertToRuleAction,
  transformAlertToRuleSystemAction,
} from '../../../../../../../common/detection_engine/transform_actions';
import { createRuleExecutionSummary } from '../../../../rule_monitoring';
import type { RuleParams } from '../../../../rule_schema';
import {
  transformFromAlertThrottle,
  transformToActionFrequency,
} from '../../../normalization/rule_actions';
import { typeSpecificCamelToSnake } from './type_specific_camel_to_snake';
import { commonParamsCamelToSnake } from './common_params_camel_to_snake';
import { normalizeRuleParams } from './normalize_rule_params';

export const internalRuleToAPIResponse = (
  rule: SanitizedRule<RuleParams> | ResolvedSanitizedRule<RuleParams>
): RequiredOptional<RuleResponse> => {
  const executionSummary = createRuleExecutionSummary(rule);

  const isResolvedRule = (obj: unknown): obj is ResolvedSanitizedRule<RuleParams> => {
    const outcome = (obj as ResolvedSanitizedRule<RuleParams>).outcome;
    return outcome != null && outcome !== 'exactMatch';
  };

  const alertActions = rule.actions.map(transformAlertToRuleAction);
  const throttle = transformFromAlertThrottle(rule);
  const actions = transformToActionFrequency(alertActions, throttle);
  const systemActions = rule.systemActions?.map((action) => {
    const transformedAction = transformAlertToRuleSystemAction(action);
    return transformedAction;
  });
  const normalizedRuleParams = normalizeRuleParams(rule.params);

  return {
    // saved object properties
    outcome: isResolvedRule(rule) ? rule.outcome : undefined,
    alias_target_id: isResolvedRule(rule) ? rule.alias_target_id : undefined,
    alias_purpose: isResolvedRule(rule) ? rule.alias_purpose : undefined,
    // Alerting framework params
    id: rule.id,
    updated_at: rule.updatedAt.toISOString(),
    updated_by: rule.updatedBy ?? 'elastic',
    created_at: rule.createdAt.toISOString(),
    created_by: rule.createdBy ?? 'elastic',
    name: rule.name,
    tags: rule.tags,
    interval: rule.schedule.interval,
    enabled: rule.enabled,
    revision: rule.revision,
    // Security solution shared rule params
    ...commonParamsCamelToSnake(normalizedRuleParams),
    // Type specific security solution rule params
    ...typeSpecificCamelToSnake(rule.params),
    // Actions
    throttle: undefined,
    actions: [...actions, ...(systemActions ?? [])],
    // Execution summary
    execution_summary: executionSummary ?? undefined,
  };
};
