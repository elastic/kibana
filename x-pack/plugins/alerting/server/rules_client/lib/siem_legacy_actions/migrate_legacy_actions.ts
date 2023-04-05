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
import { find } from '../../methods/find';
import { deleteRule } from '../../methods/delete';
import { LegacyIRuleActionsAttributes, legacyRuleActionsSavedObjectType } from './types';
import { transformFromLegacyActions } from './transform_legacy_actions';
import { validateActions } from '../validate_actions';
import { injectReferencesIntoActions } from '../../common';

type RetrieveMigratedLegacyActions = (
  context: RulesClientContext,
  { ruleId }: { ruleId: string }
) => Promise<{ legacyActions: RawRuleAction[]; legacyActionsReferences: SavedObjectReference[] }>;

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * migrates legacy actions for SIEM rules
 * @param context RulesClient context
 * @param params.ruleId - id of rule to be migrated
 * @returns
 */
export const retrieveMigratedLegacyActions: RetrieveMigratedLegacyActions = async (
  context,
  { ruleId }
) => {
  const { unsecuredSavedObjectsClient } = context;
  try {
    if (ruleId == null) {
      return { legacyActions: [], legacyActionsReferences: [] };
    }

    /**
     * On update / patch I'm going to take the actions as they are, better off taking rules client.find (siem.notification) result
     * and putting that into the actions array of the rule, then set the rules onThrottle property, notifyWhen and throttle from null -> actual value (1hr etc..)
     * Then use the rules client to delete the siem.notification
     * Then with the legacy Rule Actions saved object type, just delete it.
     */
    // find it using the references array, not params.ruleAlertId
    const [siemNotification, legacyRuleActionsSO] = await Promise.all([
      find(context, {
        options: {
          filter: 'alert.attributes.alertTypeId:(siem.notifications)',
          hasReference: {
            type: 'alert',
            id: ruleId,
          },
        },
      }),
      unsecuredSavedObjectsClient.find<LegacyIRuleActionsAttributes>({
        type: legacyRuleActionsSavedObjectType,
        hasReference: {
          type: 'alert',
          id: ruleId,
        },
      }),
    ]);

    const siemNotificationsExist = siemNotification != null && siemNotification.data.length > 0;
    const legacyRuleNotificationSOsExist =
      legacyRuleActionsSO != null && legacyRuleActionsSO.saved_objects.length > 0;

    // Assumption: if no legacy sidecar SO or notification rule types exist
    // that reference the rule in question, assume rule actions are not legacy
    if (!siemNotificationsExist && !legacyRuleNotificationSOsExist) {
      return { legacyActions: [], legacyActionsReferences: [] };
    }
    // If the legacy notification rule type ("siem.notification") exist,
    // migration and cleanup are needed
    if (siemNotificationsExist) {
      await deleteRule(context, { id: siemNotification.data[0].id });
    }
    // If legacy notification sidecar ("siem-detection-engine-rule-actions")
    // exist, migration and cleanup are needed
    if (legacyRuleNotificationSOsExist) {
      // Delete the legacy sidecar SO
      await unsecuredSavedObjectsClient.delete(
        legacyRuleActionsSavedObjectType,
        legacyRuleActionsSO.saved_objects[0].id
      );

      // If "siem-detection-engine-rule-actions" notes that `ruleThrottle` is
      // "no_actions" or "rule", rule has no actions or rule is set to run
      // action on every rule run. In these cases, sidecar deletion is the only
      // cleanup needed and updates to the "throttle" and "notifyWhen". "siem.notification" are
      // not created for these action types
      if (
        legacyRuleActionsSO.saved_objects[0].attributes.ruleThrottle === 'no_actions' ||
        legacyRuleActionsSO.saved_objects[0].attributes.ruleThrottle === 'rule'
      ) {
        return { legacyActions: [], legacyActionsReferences: [] };
      }

      return {
        legacyActions: transformFromLegacyActions(
          legacyRuleActionsSO.saved_objects[0].attributes,
          legacyRuleActionsSO.saved_objects[0].references
        ),
        legacyActionsReferences: legacyRuleActionsSO.saved_objects[0].references ?? [],
      };
    }
  } catch (e) {
    context.logger.debug(`Migration has failed for rule ${ruleId}: ${e.message}`);
  }

  return { legacyActions: [], legacyActionsReferences: [] };
};

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
    actions: [...actions, ...legacyActionsWithoutFrequencies],
    hasLegacyActions: legacyActions.length > 0,
    references: [...references, ...legacyActionsReferences],
  };
};
