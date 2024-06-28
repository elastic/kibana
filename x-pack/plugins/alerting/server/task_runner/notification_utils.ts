/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { ActionsClient, NotificationPolicyWithId } from '@kbn/actions-plugin/server/actions_client';
import { flatten } from 'lodash';
import { PublicMethodsOf } from '@kbn/utility-types';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
  SanitizedRule,
  RuleAlertData,
  SanitizedRuleAction,
} from '../../common';
import { NormalizedRuleType } from '../rule_type_registry';

interface GetMatchingNotificationsAsActionsOpts<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> {
  actionsClient: PublicMethodsOf<ActionsClient>;
  rule: SanitizedRule<Params>;
  ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    RuleState,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >;
}

export const getMatchingNotificationsAsActions = async <
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
>(
  opts: GetMatchingNotificationsAsActionsOpts<
    Params,
    ExtractedParams,
    RuleState,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >
): Promise<SanitizedRuleAction[]> => {
  // get all notifications
  const policies = await opts.actionsClient.getNotificationPolicies();

  // find matching policies
  const matchingPolicies = [];
  for (const policy of policies) {
    const conditionMatch: boolean[] = [];
    for (const policyCondition of policy.conditions) {
      switch (policyCondition.type) {
        case 'active_action_group':
          if (
            policyCondition.value.includes('all') ||
            policyCondition.value.includes(opts.rule.alertTypeId)
          ) {
            conditionMatch.push(true);
          }
          break;
        case 'recovered_action_group':
          if (
            policyCondition.value.includes('all') ||
            policyCondition.value.includes(opts.rule.alertTypeId)
          ) {
            conditionMatch.push(true);
          }
          break;
        case 'tags':
          if (opts.rule.tags?.length > 0) {
            for (const val of policyCondition.value) {
              const tagRegex = new RegExp(val);
              for (const tag of opts.rule.tags) {
                if (tagRegex.test(tag)) {
                  conditionMatch.push(true);
                  break;
                }
              }
            }
          }
          break;
        case 'name':
          for (const val of policyCondition.value) {
            const nameRegex = new RegExp(val);
            if (nameRegex.test(opts.rule.name ?? '')) {
              conditionMatch.push(true);
              break;
            }
          }
          break;
      }
    }

    if (conditionMatch.length === policy.conditions.length) {
      matchingPolicies.push(policy);
    }
  }

  console.log(`matching Policies ${JSON.stringify(matchingPolicies)}`);

  return flatten(matchingPolicies.map((policy) => convertPolicyToActions(policy, opts.ruleType)));
};

export const convertPolicyToActions = <
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
>(
  policy: NotificationPolicyWithId,
  ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    RuleState,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >
): SanitizedRuleAction[] => {
  const actions: SanitizedRuleAction[] = [];

  const hasActiveActionGroupCondition = policy.conditions.some(
    (condition) => condition.type === 'active_action_group'
  );
  const hasRecoveredActionGroupCondition = policy.conditions.some(
    (condition) => condition.type === 'recovered_action_group'
  );
  const hasNoActionGroupCondition = policy.conditions.every(
    (condition) =>
      condition.type !== 'active_action_group' && condition.type !== 'recovered_action_group'
  );

  const actionGroupIds: string[] = [];
  if (hasNoActionGroupCondition) {
    actionGroupIds.push(...ruleType.actionGroups.map((group) => group.id));
  } else if (hasActiveActionGroupCondition) {
    actionGroupIds.push(
      ...ruleType.actionGroups
        .filter((group) => group.id !== ruleType.recoveryActionGroup.id)
        .map((group) => group.id)
    );
  } else if (hasRecoveredActionGroupCondition) {
    actionGroupIds.push(
      ...ruleType.actionGroups
        .filter((group) => group.id === ruleType.recoveryActionGroup.id)
        .map((group) => group.id)
    );
  }

  for (const connector of policy.connectors) {
    for (const type of policy.alertType) {
      if (type === 'summary' && policy.frequency === 'onActionGroupChange') {
        continue;
      }
      // only use one action group for summary notifications
      const actionGroupIdsToUse = type === 'summary' ? [actionGroupIds[0]] : actionGroupIds;
      for (const actionGroupId of actionGroupIdsToUse) {
        actions.push({
          group: actionGroupId,
          id: connector.id,
          actionTypeId: connector.actionTypeId,
          params: connector.params,
          frequency: {
            summary: type === 'summary',
            throttle: policy.frequency === 'onThrottleInterval' ? policy.throttle : null,
            notifyWhen: policy.frequency,
          },
          uuid: generateActionUuid([
            actionGroupId,
            type,
            connector.id,
            connector.actionTypeId,
            policy.frequency,
          ]),
        });
      }
    }
  }

  return actions;
};

export const generateActionUuid = (hashParts: string[]) => {
  const hash = createHash('sha1');

  const hashFeed = hashParts.join('-');
  return hash.update(hashFeed).digest('hex');
};
