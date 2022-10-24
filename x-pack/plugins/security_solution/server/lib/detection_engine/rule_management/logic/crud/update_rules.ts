/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */
import type { PartialRule, RulesClient } from '@kbn/alerting-plugin/server';
import { DEFAULT_MAX_SIGNALS } from '../../../../../../common/constants';
import type { RuleUpdateProps } from '../../../../../../common/detection_engine/rule_schema';
import { transformRuleToAlertAction } from '../../../../../../common/detection_engine/transform_actions';

import type { InternalRuleUpdate, RuleParams, RuleAlertType } from '../../../rule_schema';
import { transformToAlertThrottle, transformToNotifyWhen } from '../../normalization/rule_actions';
import { typeSpecificSnakeToCamel } from '../../normalization/rule_converters';
import { maybeMute } from '../rule_actions/muting';

export interface UpdateRulesOptions {
  rulesClient: RulesClient;
  existingRule: RuleAlertType | null | undefined;
  ruleUpdate: RuleUpdateProps;
}

export const updateRules = async ({
  rulesClient,
  existingRule,
  ruleUpdate,
}: UpdateRulesOptions): Promise<PartialRule<RuleParams> | null> => {
  if (existingRule == null) {
    return null;
  }

  const typeSpecificParams = typeSpecificSnakeToCamel(ruleUpdate);
  const enabled = ruleUpdate.enabled ?? true;
  const newInternalRule: InternalRuleUpdate = {
    name: ruleUpdate.name,
    tags: ruleUpdate.tags ?? [],
    params: {
      author: ruleUpdate.author ?? [],
      buildingBlockType: ruleUpdate.building_block_type,
      description: ruleUpdate.description,
      ruleId: existingRule.params.ruleId,
      falsePositives: ruleUpdate.false_positives ?? [],
      from: ruleUpdate.from ?? 'now-6m',
      // Unlike the create route, immutable comes from the existing rule here
      immutable: existingRule.params.immutable,
      license: ruleUpdate.license,
      outputIndex: ruleUpdate.output_index ?? '',
      timelineId: ruleUpdate.timeline_id,
      timelineTitle: ruleUpdate.timeline_title,
      meta: ruleUpdate.meta,
      maxSignals: ruleUpdate.max_signals ?? DEFAULT_MAX_SIGNALS,
      relatedIntegrations: existingRule.params.relatedIntegrations,
      requiredFields: existingRule.params.requiredFields,
      riskScore: ruleUpdate.risk_score,
      riskScoreMapping: ruleUpdate.risk_score_mapping ?? [],
      ruleNameOverride: ruleUpdate.rule_name_override,
      setup: existingRule.params.setup,
      severity: ruleUpdate.severity,
      severityMapping: ruleUpdate.severity_mapping ?? [],
      threat: ruleUpdate.threat ?? [],
      timestampOverride: ruleUpdate.timestamp_override,
      timestampOverrideFallbackDisabled: ruleUpdate.timestamp_override_fallback_disabled,
      to: ruleUpdate.to ?? 'now',
      references: ruleUpdate.references ?? [],
      namespace: ruleUpdate.namespace,
      note: ruleUpdate.note,
      // Always use the version from the request if specified. If it isn't specified, leave immutable rules alone and
      // increment the version of mutable rules by 1.
      version:
        ruleUpdate.version ?? existingRule.params.immutable
          ? existingRule.params.version
          : existingRule.params.version + 1,
      exceptionsList: ruleUpdate.exceptions_list ?? [],
      ...typeSpecificParams,
    },
    schedule: { interval: ruleUpdate.interval ?? '5m' },
    actions: ruleUpdate.actions != null ? ruleUpdate.actions.map(transformRuleToAlertAction) : [],
    throttle: transformToAlertThrottle(ruleUpdate.throttle),
    notifyWhen: transformToNotifyWhen(ruleUpdate.throttle),
  };

  const update = await rulesClient.update({
    id: existingRule.id,
    data: newInternalRule,
  });

  await maybeMute({
    rulesClient,
    muteAll: existingRule.muteAll,
    throttle: ruleUpdate.throttle,
    id: update.id,
  });

  if (existingRule.enabled && enabled === false) {
    await rulesClient.disable({ id: existingRule.id });
  } else if (!existingRule.enabled && enabled === true) {
    await rulesClient.enable({ id: existingRule.id });
  }
  return { ...update, enabled };
};
