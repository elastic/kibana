/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAction, RuleNotifyWhenType, SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SavedObjectReference } from '@kbn/core/server';
import { isEmpty } from 'lodash/fp';
import {
  NOTIFICATION_THROTTLE_NO_ACTIONS,
  NOTIFICATION_THROTTLE_RULE,
} from '../../../../common/constants';
import type {
  AddPrepackagedRulesSchema,
  FullResponseSchema,
} from '../../../../common/detection_engine/schemas/request';
import { transformAlertToRuleAction } from '../../../../common/detection_engine/transform_actions';
import { withSecuritySpan } from '../../../utils/with_security_span';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from '../rule_actions/legacy_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import type {
  LegacyIRuleActionsAttributes,
  LegacyRuleActions,
  LegacyRuleAlertSavedObjectAction,
} from '../rule_actions/legacy_types';
import type { RuleParams } from '../schemas/rule_schemas';
import type { LegacyMigrateParams, RuleAlertType } from './types';

/**
 * Given a throttle from a "security_solution" rule this will transform it into an "alerting" notifyWhen
 * on their saved object.
 * @params throttle The throttle from a "security_solution" rule
 * @returns The correct "NotifyWhen" for a Kibana alerting.
 */
export const transformToNotifyWhen = (
  throttle: string | null | undefined
): RuleNotifyWhenType | null => {
  if (throttle == null || throttle === NOTIFICATION_THROTTLE_NO_ACTIONS) {
    return null; // Although I return null, this does not change the value of the "notifyWhen" and it keeps the current value of "notifyWhen"
  } else if (throttle === NOTIFICATION_THROTTLE_RULE) {
    return 'onActiveAlert';
  } else {
    return 'onThrottleInterval';
  }
};

/**
 * Given a throttle from a "security_solution" rule this will transform it into an "alerting" "throttle"
 * on their saved object.
 * @params throttle The throttle from a "security_solution" rule
 * @returns The "alerting" throttle
 */
export const transformToAlertThrottle = (throttle: string | null | undefined): string | null => {
  if (
    throttle == null ||
    throttle === NOTIFICATION_THROTTLE_RULE ||
    throttle === NOTIFICATION_THROTTLE_NO_ACTIONS
  ) {
    return null;
  } else {
    return throttle;
  }
};

/**
 * Given a set of actions from an "alerting" Saved Object (SO) this will transform it into a "security_solution" alert action.
 * If this detects any legacy rule actions it will transform it. If both are sent in which is not typical but possible due to
 * the split nature of the API's this will prefer the usage of the non-legacy version. Eventually the "legacyRuleActions" should
 * be removed.
 * @param alertAction The alert action form a "alerting" Saved Object (SO).
 * @param legacyRuleActions Legacy "side car" rule actions that if it detects it being passed it in will transform using it.
 * @returns The actions of the FullResponseSchema
 */
export const transformActions = (
  alertAction: RuleAction[] | undefined,
  legacyRuleActions: LegacyRuleActions | null | undefined
): FullResponseSchema['actions'] => {
  if (alertAction != null && alertAction.length !== 0) {
    return alertAction.map((action) => transformAlertToRuleAction(action));
  } else if (legacyRuleActions != null) {
    return legacyRuleActions.actions;
  } else {
    return [];
  }
};

/**
 * Given a throttle from an "alerting" Saved Object (SO) this will transform it into a "security_solution"
 * throttle type. If given the "legacyRuleActions" but we detect that the rule for an unknown reason has actions
 * on it to which should not be typical but possible due to the split nature of the API's, this will prefer the
 * usage of the non-legacy version. Eventually the "legacyRuleActions" should be removed.
 * @param throttle The throttle from a  "alerting" Saved Object (SO)
 * @param legacyRuleActions Legacy "side car" rule actions that if it detects it being passed it in will transform using it.
 * @returns The "security_solution" throttle
 */
export const transformFromAlertThrottle = (
  rule: SanitizedRule<RuleParams>,
  legacyRuleActions: LegacyRuleActions | null | undefined
): string => {
  if (legacyRuleActions == null || (rule.actions != null && rule.actions.length > 0)) {
    if (rule.muteAll || rule.actions.length === 0) {
      return NOTIFICATION_THROTTLE_NO_ACTIONS;
    } else if (
      rule.notifyWhen === 'onActiveAlert' ||
      (rule.throttle == null && rule.notifyWhen == null)
    ) {
      return NOTIFICATION_THROTTLE_RULE;
    } else if (rule.throttle == null) {
      return NOTIFICATION_THROTTLE_NO_ACTIONS;
    } else {
      return rule.throttle;
    }
  } else {
    return legacyRuleActions.ruleThrottle;
  }
};

/**
 * Mutes, unmutes, or does nothing to the alert if no changed is detected
 * @param id The id of the alert to (un)mute
 * @param rulesClient the rules client
 * @param muteAll If the existing alert has all actions muted
 * @param throttle If the existing alert has a throttle set
 */
export const maybeMute = async ({
  id,
  rulesClient,
  muteAll,
  throttle,
}: {
  id: SanitizedRule['id'];
  rulesClient: RulesClient;
  muteAll: SanitizedRule<RuleParams>['muteAll'];
  throttle: string | null | undefined;
}): Promise<void> => {
  if (muteAll && throttle !== NOTIFICATION_THROTTLE_NO_ACTIONS) {
    await rulesClient.unmuteAll({ id });
  } else if (!muteAll && throttle === NOTIFICATION_THROTTLE_NO_ACTIONS) {
    await rulesClient.muteAll({ id });
  } else {
    // Do nothing, no-operation
  }
};

/**
 * Translate legacy action sidecar action to rule action
 */
export const getUpdatedActionsParams = ({
  rule,
  ruleThrottle,
  actions,
  references,
}: {
  rule: SanitizedRule<RuleParams>;
  ruleThrottle: string | null;
  actions: LegacyRuleAlertSavedObjectAction[];
  references: SavedObjectReference[];
}): Omit<SanitizedRule<RuleParams>, 'id'> => {
  const { id, ...restOfRule } = rule;

  const actionReference = references.reduce<Record<string, SavedObjectReference>>(
    (acc, reference) => {
      acc[reference.name] = reference;
      return acc;
    },
    {}
  );

  if (isEmpty(actionReference)) {
    throw new Error(
      `An error occurred migrating legacy action for rule with id:${id}. Connector reference id not found.`
    );
  }
  // If rule has an action on any other interval (other than on every
  // rule run), need to move the action info from the sidecar/legacy action
  // into the rule itself
  return {
    ...restOfRule,
    actions: actions.reduce<RuleAction[]>((acc, action) => {
      const { actionRef, action_type_id: actionTypeId, ...resOfAction } = action;
      if (!actionReference[actionRef]) {
        return acc;
      }
      return [
        ...acc,
        {
          ...resOfAction,
          id: actionReference[actionRef].id,
          actionTypeId,
        },
      ];
    }, []),
    throttle: transformToAlertThrottle(ruleThrottle),
    notifyWhen: transformToNotifyWhen(ruleThrottle),
  };
};

/**
 * Determines if rule needs to be migrated from legacy actions
 * and returns necessary pieces for the updated rule
 */
export const legacyMigrate = async ({
  rulesClient,
  savedObjectsClient,
  rule,
}: LegacyMigrateParams): Promise<SanitizedRule<RuleParams> | null | undefined> =>
  withSecuritySpan('legacyMigrate', async () => {
    if (rule == null || rule.id == null) {
      return rule;
    }
    /**
     * On update / patch I'm going to take the actions as they are, better off taking rules client.find (siem.notification) result
     * and putting that into the actions array of the rule, then set the rules onThrottle property, notifyWhen and throttle from null -> actual value (1hr etc..)
     * Then use the rules client to delete the siem.notification
     * Then with the legacy Rule Actions saved object type, just delete it.
     */
    // find it using the references array, not params.ruleAlertId
    const [siemNotification, legacyRuleActionsSO] = await Promise.all([
      rulesClient.find({
        options: {
          filter: 'alert.attributes.alertTypeId:(siem.notifications)',
          hasReference: {
            type: 'alert',
            id: rule.id,
          },
        },
      }),
      savedObjectsClient.find<LegacyIRuleActionsAttributes>({
        type: legacyRuleActionsSavedObjectType,
        hasReference: {
          type: 'alert',
          id: rule.id,
        },
      }),
    ]);

    const siemNotificationsExist = siemNotification != null && siemNotification.data.length > 0;
    const legacyRuleNotificationSOsExist =
      legacyRuleActionsSO != null && legacyRuleActionsSO.saved_objects.length > 0;

    // Assumption: if no legacy sidecar SO or notification rule types exist
    // that reference the rule in question, assume rule actions are not legacy
    if (!siemNotificationsExist && !legacyRuleNotificationSOsExist) {
      return rule;
    }
    // If the legacy notification rule type ("siem.notification") exist,
    // migration and cleanup are needed
    if (siemNotificationsExist) {
      await rulesClient.delete({ id: siemNotification.data[0].id });
    }
    // If legacy notification sidecar ("siem-detection-engine-rule-actions")
    // exist, migration and cleanup are needed
    if (legacyRuleNotificationSOsExist) {
      // Delete the legacy sidecar SO
      await savedObjectsClient.delete(
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
        return rule;
      }

      // Use "legacyRuleActionsSO" instead of "siemNotification" as "siemNotification" is not created
      // until a rule is run and added to task manager. That means that if by chance a user has a rule
      // with actions which they have yet to enable, the actions would be lost. Instead,
      // "legacyRuleActionsSO" is created on rule creation (pre 7.15) and we can rely on it to be there
      const migratedRule = getUpdatedActionsParams({
        rule,
        ruleThrottle: legacyRuleActionsSO.saved_objects[0].attributes.ruleThrottle,
        actions: legacyRuleActionsSO.saved_objects[0].attributes.actions,
        references: legacyRuleActionsSO.saved_objects[0].references,
      });

      await rulesClient.update({
        id: rule.id,
        data: migratedRule,
      });

    return { id: rule.id, ...migratedRule };
  }
};

/**
 * Mutes, unmutes, or does nothing to the alert if no changed is detected
 * @param id The id of the alert to (un)mute
 * @param rulesClient the rules client
 * @param muteAll If the existing alert has all actions muted
 * @param throttle If the existing alert has a throttle set
 */
export const checkExceptionListReferences = async ({
  ruleSoId,
  rulesClient,
  exceptionLists,
}: {
  ruleSoId: string;
  rulesClient: RulesClient;
  exceptionLists: ListArray | undefined;
}): Promise<null | ListArray> => {
  console.log({ LISTS: exceptionLists });

  if (exceptionLists == null) {
    return null;
  }

  const ruleDefaultExceptionLists = exceptionLists.filter(
    (list) => list.type === ExceptionListTypeEnum.DETECTION_RULE
  );

  if (!ruleDefaultExceptionLists.length) {
    return null;
  } else {
    console.log({ RULE_ID: ruleSOId });
    const foundReferences: Array<FindResult<RuleParams>> = await Promise.all(
      ruleDefaultExceptionLists.flatMap(({ type, id }) => {
        const foundRules = rulesClient.find({
          options: {
            hasReference: {
              type,
              id,
            },
          },
        });
        return foundRules.data;
      })
    );
    console.log({ FOUND_REFERENCES: foundReferences });

    if (!foundReferences.length) {
      return null;
    }

    const { referenceNotMatchingRule: foundReferenceNotMatchingRule, listsNotMatchingRule } =
      foundReferences.reduce(
        (acc, foundReference) => {
          if (acc || foundReference.id !== ruleSoId) {
            return {
              referenceNotMatchingRule: true,
              listsNotMatchingRule: [...acc.listsNotMatchingRule, foundReference],
            };
          }

          return acc;
        },
        { referenceNotMatchingRule: false, listsNotMatchingRule: [] }
      );

    if (!foundReferenceNotMatchingRule) {
      return null;
    } else {
      return listsNotMatchingRule;
    }
  }
};

/**
 * Converts an array of prepackaged rules to a Map with rule IDs as keys
 *
 * @param rules Array of prepackaged rules
 * @returns Map
 */
export const prepackagedRulesToMap = (rules: AddPrepackagedRulesSchema[]) =>
  new Map(rules.map((rule) => [rule.rule_id, rule]));

/**
 * Converts an array of rules to a Map with rule IDs as keys
 *
 * @param rules Array of rules
 * @returns Map
 */
export const rulesToMap = (rules: RuleAlertType[]) =>
  new Map(rules.map((rule) => [rule.params.ruleId, rule]));
