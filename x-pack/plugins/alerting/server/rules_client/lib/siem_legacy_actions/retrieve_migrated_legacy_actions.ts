/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { RulesClientContext } from '../..';
import { RawRuleAction } from '../../../types';
import { find } from '../../methods/find';
import { deleteRule } from '../../methods/delete';
import { LegacyIRuleActionsAttributes, legacyRuleActionsSavedObjectType } from './types';
import { transformFromLegacyActions } from './transform_legacy_actions';

type RetrieveMigratedLegacyActions = (
  context: RulesClientContext,
  { ruleId }: { ruleId: string },
  validateLegacyActions: (
    legacyActions: RawRuleAction[],
    legacyActionsReferences: SavedObjectReference[]
  ) => Promise<void>
) => Promise<{ legacyActions: RawRuleAction[]; legacyActionsReferences: SavedObjectReference[] }>;

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * retrieves legacy actions for SIEM rule and deletes associated sidecar SO
 * @param context RulesClient context
 * @param params.ruleId - id of rule to be migrated
 * @returns
 */
export const retrieveMigratedLegacyActions: RetrieveMigratedLegacyActions = async (
  context,
  { ruleId },
  validateLegacyActions
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
            type: RULE_SAVED_OBJECT_TYPE,
            id: ruleId,
          },
        },
      }),
      unsecuredSavedObjectsClient.find<LegacyIRuleActionsAttributes>({
        type: legacyRuleActionsSavedObjectType,
        hasReference: {
          type: RULE_SAVED_OBJECT_TYPE,
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

    const deleteLegacyActions = async () => {
      await Promise.all([
        // If the legacy notification rule type ("siem.notification") exist,
        // migration and cleanup are needed
        siemNotificationsExist && deleteRule(context, { id: siemNotification.data[0].id }),
        // Delete the legacy sidecar SO if it exists
        legacyRuleNotificationSOsExist &&
          unsecuredSavedObjectsClient.delete(
            legacyRuleActionsSavedObjectType,
            legacyRuleActionsSO.saved_objects[0].id
          ),
      ]);
    };

    // If legacy notification sidecar ("siem-detection-engine-rule-actions")
    // exist, migration is needed
    if (legacyRuleNotificationSOsExist) {
      // If "siem-detection-engine-rule-actions" notes that `ruleThrottle` is
      // "no_actions" or "rule", rule has no actions or rule is set to run
      // action on every rule run. In these cases, sidecar deletion is the only
      // cleanup needed and updates to the "throttle" and "notifyWhen". "siem.notification" are
      // not created for these action types
      if (
        legacyRuleActionsSO.saved_objects[0].attributes.ruleThrottle === 'no_actions' ||
        legacyRuleActionsSO.saved_objects[0].attributes.ruleThrottle === 'rule'
      ) {
        await deleteLegacyActions();
        return { legacyActions: [], legacyActionsReferences: [] };
      }

      const legacyActions = transformFromLegacyActions(
        legacyRuleActionsSO.saved_objects[0].attributes,
        legacyRuleActionsSO.saved_objects[0].references
      );
      // only action references need to be saved
      const legacyActionsReferences =
        legacyRuleActionsSO.saved_objects[0].references.filter(({ type }) => type === 'action') ??
        [];
      await validateLegacyActions(legacyActions, legacyActionsReferences);

      // Delete legacy actions only after the validation
      await deleteLegacyActions();
      return { legacyActions, legacyActionsReferences };
    }
    await deleteLegacyActions();
  } catch (e) {
    context.logger.debug(`Migration has failed for rule ${ruleId}: ${e.message}`);
    throw e;
  }

  return { legacyActions: [], legacyActionsReferences: [] };
};
