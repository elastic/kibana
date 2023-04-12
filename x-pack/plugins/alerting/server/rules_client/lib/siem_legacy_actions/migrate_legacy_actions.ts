/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import omit from 'lodash/omit';

import type { SavedObjectReference } from '@kbn/core/server';
import type { RulesClientContext } from '../..';
import { RawRuleAction, RawRule } from '../../../types';
import { validateActions } from '../validate_actions';
import { injectReferencesIntoActions } from '../../common';
import { retrieveMigratedLegacyActions } from './retrieve_migrated_legacy_actions';

type MigrateLegacyActions = (
  context: RulesClientContext,
  params: {
    ruleId: string;
    references?: SavedObjectReference[];
    actions?: RawRuleAction[];
    attributes: RawRule;
    skipActionsValidation?: boolean;
  }
) => Promise<{
  resultedActions: RawRuleAction[];
  resultedReferences: SavedObjectReference[];
  hasLegacyActions: boolean;
}>;

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * migrates SIEM legacy  actions and merges rule actions and references
 * @param context RulesClient context
 * @param params
 * @returns
 */
export const migrateLegacyActions: MigrateLegacyActions = async (
  context: RulesClientContext,
  { ruleId, actions = [], references = [], attributes, skipActionsValidation }
) => {
  if (attributes?.consumer === AlertConsumers.SIEM) {
    return {
      resultedActions: [],
      hasLegacyActions: false,
      resultedReferences: [],
    };
  }

  const { legacyActions, legacyActionsReferences } = await retrieveMigratedLegacyActions(context, {
    ruleId,
  });

  // TODO https://github.com/elastic/kibana/issues/148414
  // If any action-level frequencies get pushed into a SIEM rule, strip their frequencies
  // we put frequency into legacy action already. Once https://github.com/elastic/kibana/pull/153113 is merged, we should get rid of this code
  const legacyActionsWithoutFrequencies = legacyActions.map(
    (action) => omit(action, 'frequency') as RawRuleAction
  );

  // sometimes we don't need to validate legacy actions. For example, when delete rules or update rule from payload
  if (skipActionsValidation) {
    const ruleType = context.ruleTypeRegistry.get(attributes.alertTypeId);
    await validateActions(context, ruleType, {
      ...attributes,
      actions: injectReferencesIntoActions(
        ruleId,
        legacyActionsWithoutFrequencies,
        legacyActionsReferences
      ),
    });
  }

  // fix references for a case when actions present in a rule
  if (actions.length) {
    legacyActions.forEach((legacyAction, i) => {
      const oldReference = legacyAction.actionRef;
      const legacyReference = legacyActionsReferences.find(({ name }) => name === oldReference);
      const newReference = `action_${actions.length + i}`;
      legacyAction.actionRef = newReference;

      if (legacyReference) {
        legacyReference.name = newReference;
      }
    });
  }

  // put frequencies into existing actions
  // the situation when both action in rule nad legacy exist should be rare one
  // but if it happens, we put frequency in existing actions per-action level
  const existingActionsWithFrequencies: RawRuleAction[] = actions.map((action) => ({
    ...action,
    frequency: {
      summary: true,
      notifyWhen:
        attributes.notifyWhen ?? legacyActions[0].frequency?.notifyWhen ?? 'onThrottleInterval',
      throttle: attributes.throttle ?? legacyActions[0].frequency?.throttle ?? null,
    },
  }));

  return {
    resultedActions: [...existingActionsWithFrequencies, ...legacyActions],
    hasLegacyActions: legacyActions.length > 0,
    resultedReferences: [...references, ...legacyActionsReferences],
  };
};
