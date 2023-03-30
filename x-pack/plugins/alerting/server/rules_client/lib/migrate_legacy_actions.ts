/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash/fp';
import { AlertConsumers } from '@kbn/rule-data-utils';
import type { SavedObjectReference } from '@kbn/core/server';

import type { RulesClientContext } from '..';

import { RuleActionParams, RawRuleAction } from '../../types';

import { find } from '../methods/find';
import { deleteRule } from '../methods/delete';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyRuleActionsSavedObjectType = 'siem-detection-engine-rule-actions';

/**
 * This is how it is stored on disk in its "raw format" for 7.16+
 * @deprecated Remove this once the legacy notification/side car is gone
 */
export interface LegacyRuleAlertSavedObjectAction {
  group: string;
  params: RuleActionParams;
  action_type_id: string;
  actionRef: string;
}
/**
 * We keep this around to migrate and update data for the old deprecated rule actions saved object mapping but we
 * do not use it anymore within the code base. Once we feel comfortable that users are upgrade far enough and this is no longer
 * needed then it will be safe to remove this saved object and all its migrations.
 * @deprecated Remove this once the legacy notification/side car is gone
 */
export interface LegacyIRuleActionsAttributes extends Record<string, unknown> {
  actions: LegacyRuleAlertSavedObjectAction[];
  ruleThrottle: string;
  alertThrottle: string | null;
}

type MigrateLegacyActions = (
  context: RulesClientContext,
  { ruleId }: { ruleId: string; consumer: string }
) => Promise<{ legacyActions: RawRuleAction[]; legacyActionsReferences: SavedObjectReference[] }>;

export const migrateLegacyActions: MigrateLegacyActions = async (context, { ruleId, consumer }) => {
  const { unsecuredSavedObjectsClient } = context;
  try {
    if (ruleId == null || consumer !== AlertConsumers.SIEM) {
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

export const transformFromLegacyActions = (
  legacyActionsAttr: LegacyIRuleActionsAttributes,
  references: SavedObjectReference[]
): RawRuleAction[] => {
  const actionReference = references.reduce<Record<string, SavedObjectReference>>(
    (acc, reference) => {
      acc[reference.name] = reference;
      return acc;
    },
    {}
  );

  if (isEmpty(actionReference)) {
    throw new Error(`Connector reference id not found.`);
  }

  return legacyActionsAttr.actions.reduce<RawRuleAction[]>((acc, action) => {
    const { actionRef, action_type_id: actionTypeId, group, params } = action;
    if (!actionReference[actionRef]) {
      return acc;
    }
    return [
      ...acc,
      {
        group,
        params,
        uuid: actionReference[actionRef].id, // TODO: generate id?
        actionRef,
        actionTypeId,
        frequency: {
          summary: true,
          notifyWhen: 'onThrottleInterval',
          throttle: legacyActionsAttr.ruleThrottle,
        },
      },
    ];
  }, []);
};
