/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import { DEFAULT_MAX_SIGNALS } from '../../../../common/constants';
import { transformRuleToAlertAction } from '../../../../common/detection_engine/transform_actions';
import { PartialAlert } from '../../../../../alerts/server';
import { readRules } from './read_rules';
import { UpdateRulesOptions } from './types';
import { addTags } from './add_tags';
import { ruleStatusSavedObjectsClientFactory } from '../signals/rule_status_saved_objects_client';
import { typeSpecificSnakeToCamel } from '../schemas/rule_converters';
import { InternalRuleUpdate } from '../schemas/rule_schemas';
import { RuleTypeParams } from '../types';

export const updateRules = async ({
  alertsClient,
  savedObjectsClient,
  defaultOutputIndex,
  ruleUpdate,
}: UpdateRulesOptions): Promise<PartialAlert<RuleTypeParams> | null> => {
  const existingRule = await readRules({
    alertsClient,
    ruleId: ruleUpdate.rule_id,
    id: ruleUpdate.id,
  });
  if (existingRule == null) {
    return null;
  }

  const typeSpecificParams = typeSpecificSnakeToCamel(ruleUpdate);
  const throttle = ruleUpdate.throttle ?? null;
  const enabled = ruleUpdate.enabled ?? true;
  const newInternalRule: InternalRuleUpdate = {
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
    actions: throttle === 'rule' ? (ruleUpdate.actions ?? []).map(transformRuleToAlertAction) : [],
    throttle: null,
    notifyWhen: null,
  };

  /**
   * TODO: Remove this use of `as` by utilizing the proper type
   */
  const update = (await alertsClient.update({
    id: existingRule.id,
    data: newInternalRule,
  })) as PartialAlert<RuleTypeParams>;

  if (existingRule.enabled && enabled === false) {
    await alertsClient.disable({ id: existingRule.id });
  } else if (!existingRule.enabled && enabled === true) {
    await alertsClient.enable({ id: existingRule.id });

    const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
    const ruleCurrentStatus = await ruleStatusClient.find({
      perPage: 1,
      sortField: 'statusDate',
      sortOrder: 'desc',
      search: existingRule.id,
      searchFields: ['alertId'],
    });

    // set current status for this rule to be 'going to run'
    if (ruleCurrentStatus && ruleCurrentStatus.saved_objects.length > 0) {
      const currentStatusToDisable = ruleCurrentStatus.saved_objects[0];
      await ruleStatusClient.update(currentStatusToDisable.id, {
        ...currentStatusToDisable.attributes,
        status: 'going to run',
      });
    }
  }
  return { ...update, enabled };
};
