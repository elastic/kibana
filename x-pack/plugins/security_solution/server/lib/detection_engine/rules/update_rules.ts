/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */
import { validate } from '@kbn/securitysolution-io-ts-utils';
import { isEqual } from 'lodash';
import { DEFAULT_MAX_SIGNALS } from '../../../../common/constants';
import { transformRuleToAlertAction } from '../../../../common/detection_engine/transform_actions';
import { PartialAlert } from '../../../../../alerting/server';
import { AlertAction } from '../../../../../alerting/common';

import { readRules } from './read_rules';
import { UpdateRulesOptions } from './types';
import { addTags } from './add_tags';
import { typeSpecificSnakeToCamel } from '../schemas/rule_converters';
import { internalRuleUpdate, RuleParams } from '../schemas/rule_schemas';
import { enableRule } from './enable_rule';
import { maybeMute, transformToAlertThrottle, transformToNotifyWhen } from './utils';

class UpdateError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const updateRules = async ({
  isRuleRegistryEnabled,
  spaceId,
  rulesClient,
  ruleStatusClient,
  defaultOutputIndex,
  existingRule,
  migratedRule,
  ruleUpdate,
  savedObjectsClient,
}: UpdateRulesOptions): Promise<PartialAlert<RuleParams> | null> => {
  // const existingRule = await readRules({
  //   isRuleRegistryEnabled,
  //   rulesClient,
  //   ruleId: ruleUpdate.rule_id,
  //   id: ruleUpdate.id,
  // });
  if (existingRule == null) {
    return null;
  }

  const updateNotifyWhen = (
    transform: typeof transformToAlertThrottle | typeof transformToNotifyWhen,
    migratedRuleThrottle: string | null | undefined,
    existingRuleThrottle: string | null | undefined,
    ruleUpdateThrottle: string | null | undefined
  ) => {
    console.error(`migratedRuleThrottle ${migratedRuleThrottle}`);
    console.error(`existingRuleThrottle ${existingRuleThrottle}`);
    console.error(`ruleUpdateThrottle ${ruleUpdateThrottle}`);
    if (
      existingRuleThrottle == null &&
      ruleUpdateThrottle == null &&
      migratedRuleThrottle != null
    ) {
      return migratedRuleThrottle;
    }
    return transform(ruleUpdate.throttle);
  };

  const updateThrottle = (
    transform: typeof transformToAlertThrottle | typeof transformToNotifyWhen,
    migratedRuleThrottle: string | null | undefined,
    existingRuleThrottle: string | null | undefined,
    ruleUpdateThrottle: string | null | undefined
  ) => {
    if (
      existingRuleThrottle == null &&
      ruleUpdateThrottle == null &&
      migratedRuleThrottle != null
    ) {
      return migratedRuleThrottle;
    }
    return transform(ruleUpdate.throttle);
  };

  const updateActions = (
    transform: typeof transformRuleToAlertAction,
    migratedRuleActions: AlertAction[] | null | undefined,
    existingRuleActions: AlertAction[] | null | undefined,
    ruleUpdateActions: AlertAction[] | null | undefined
  ) => {
    // console.error('migratedRuleActions', JSON.stringify(migratedRuleActions, null, 2));
    // console.error('existingRuleActions', JSON.stringify(existingRuleActions, null, 2));
    // console.error('ruleUpdateActions', JSON.stringify(ruleUpdateActions, null, 2));
    // if the existing rule actions and the rule update actions are equivalent (aka no change)
    // but the migrated actions and the ruleUpdateActions (or existing rule actions, associatively)
    // are not equivalent, we know that the rules' actions were migrated and we need to apply
    // that change to the update request so it is not overwritten by the rule update payload
    if (
      existingRuleActions?.length === 0 &&
      ruleUpdateActions == null &&
      !isEqual(existingRuleActions, migratedRuleActions)
    ) {
      return migratedRuleActions;
    }
    return ruleUpdateActions != null ? ruleUpdateActions.map(transform) : [];
  };

  const typeSpecificParams = typeSpecificSnakeToCamel(ruleUpdate);
  const enabled = ruleUpdate.enabled ?? true;
  const newInternalRule = {
    name: ruleUpdate.name,
    tags: addTags(ruleUpdate.tags ?? [], existingRule.params.ruleId, existingRule.params.immutable),
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
      outputIndex: ruleUpdate.output_index ?? defaultOutputIndex,
      timelineId: ruleUpdate.timeline_id,
      timelineTitle: ruleUpdate.timeline_title,
      meta: ruleUpdate.meta,
      maxSignals: ruleUpdate.max_signals ?? DEFAULT_MAX_SIGNALS,
      riskScore: ruleUpdate.risk_score,
      riskScoreMapping: ruleUpdate.risk_score_mapping ?? [],
      ruleNameOverride: ruleUpdate.rule_name_override,
      severity: ruleUpdate.severity,
      severityMapping: ruleUpdate.severity_mapping ?? [],
      threat: ruleUpdate.threat ?? [],
      timestampOverride: ruleUpdate.timestamp_override,
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
    actions: updateActions(
      transformRuleToAlertAction,
      migratedRule?.actions,
      existingRule.actions,
      ruleUpdate?.actions
    ),
    throttle: updateThrottle(
      transformToAlertThrottle,
      migratedRule?.throttle,
      existingRule.throttle,
      ruleUpdate?.throttle
    ),
    notifyWhen: updateNotifyWhen(
      transformToNotifyWhen,
      migratedRule?.notifyWhen,
      existingRule.notifyWhen,
      ruleUpdate?.throttle
    ),
  };

  const [validated, errors] = validate(newInternalRule, internalRuleUpdate);
  if (errors != null || validated === null) {
    throw new UpdateError(`Applying update would create invalid rule: ${errors}`, 400);
  }

  const update = await rulesClient.update({
    id: existingRule.id,
    data: validated,
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
    await enableRule({ rule: existingRule, rulesClient, ruleStatusClient, spaceId });
  }
  return { ...update, enabled };
};
