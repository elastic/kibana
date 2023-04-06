/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
    attributes?: RawRule;
  }
) => Promise<{
  actions: RawRuleAction[];
  references: SavedObjectReference[];
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
  { ruleId, actions = [], references = [], attributes }
) => {
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
  if (attributes) {
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

  return {
    actions: [...actions, ...legacyActions],
    hasLegacyActions: legacyActions.length > 0,
    references: [...references, ...legacyActionsReferences],
  };
};
