/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBy, isEmpty } from 'lodash/fp';
import type {
  FromOrUndefined,
  MachineLearningJobIdOrUndefined,
  RiskScoreMappingOrUndefined,
  RiskScoreOrUndefined,
  ConcurrentSearchesOrUndefined,
  ItemsPerSearchOrUndefined,
  ThreatFiltersOrUndefined,
  ThreatIndexOrUndefined,
  ThreatLanguageOrUndefined,
  ThreatMappingOrUndefined,
  ThreatQueryOrUndefined,
  ThreatsOrUndefined,
  TypeOrUndefined,
  LanguageOrUndefined,
  SeverityOrUndefined,
  SeverityMappingOrUndefined,
  MaxSignalsOrUndefined,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { ListArrayOrUndefined } from '@kbn/securitysolution-io-ts-list-types';
import type { VersionOrUndefined } from '@kbn/securitysolution-io-ts-types';
import { AlertAction, AlertNotifyWhenType, SanitizedAlert } from '../../../../../alerting/common';
import {
  DescriptionOrUndefined,
  AnomalyThresholdOrUndefined,
  QueryOrUndefined,
  SavedIdOrUndefined,
  TimelineIdOrUndefined,
  TimelineTitleOrUndefined,
  IndexOrUndefined,
  NoteOrUndefined,
  MetaOrUndefined,
  FalsePositivesOrUndefined,
  OutputIndexOrUndefined,
  IntervalOrUndefined,
  NameOrUndefined,
  TagsOrUndefined,
  ToOrUndefined,
  ThresholdOrUndefined,
  ReferencesOrUndefined,
  AuthorOrUndefined,
  BuildingBlockTypeOrUndefined,
  LicenseOrUndefined,
  RuleNameOverrideOrUndefined,
  TimestampOverrideOrUndefined,
  EventCategoryOverrideOrUndefined,
  NamespaceOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';
import { PartialFilter } from '../types';
import { RuleParams } from '../schemas/rule_schemas';
import {
  NOTIFICATION_THROTTLE_NO_ACTIONS,
  NOTIFICATION_THROTTLE_RULE,
} from '../../../../common/constants';
import { RulesClient } from '../../../../../alerting/server';
// eslint-disable-next-line no-restricted-imports
import { LegacyRuleActions } from '../rule_actions/legacy_types';
import { FullResponseSchema } from '../../../../common/detection_engine/schemas/request';
import { transformAlertToRuleAction } from '../../../../common/detection_engine/transform_actions';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from '../rule_actions/legacy_saved_object_mappings';
import { LegacyMigrateParams } from './types';

export const calculateInterval = (
  interval: string | undefined,
  ruleInterval: string | undefined
): string => {
  if (interval != null) {
    return interval;
  } else if (ruleInterval != null) {
    return ruleInterval;
  } else {
    return '5m';
  }
};

export interface UpdateProperties {
  author: AuthorOrUndefined;
  buildingBlockType: BuildingBlockTypeOrUndefined;
  description: DescriptionOrUndefined;
  eventCategoryOverride: EventCategoryOverrideOrUndefined;
  falsePositives: FalsePositivesOrUndefined;
  from: FromOrUndefined;
  query: QueryOrUndefined;
  language: LanguageOrUndefined;
  license: LicenseOrUndefined;
  savedId: SavedIdOrUndefined;
  timelineId: TimelineIdOrUndefined;
  timelineTitle: TimelineTitleOrUndefined;
  meta: MetaOrUndefined;
  machineLearningJobId: MachineLearningJobIdOrUndefined;
  filters: PartialFilter[];
  index: IndexOrUndefined;
  interval: IntervalOrUndefined;
  maxSignals: MaxSignalsOrUndefined;
  riskScore: RiskScoreOrUndefined;
  riskScoreMapping: RiskScoreMappingOrUndefined;
  ruleNameOverride: RuleNameOverrideOrUndefined;
  outputIndex: OutputIndexOrUndefined;
  name: NameOrUndefined;
  severity: SeverityOrUndefined;
  severityMapping: SeverityMappingOrUndefined;
  tags: TagsOrUndefined;
  threat: ThreatsOrUndefined;
  threshold: ThresholdOrUndefined;
  threatFilters: ThreatFiltersOrUndefined;
  threatIndex: ThreatIndexOrUndefined;
  threatQuery: ThreatQueryOrUndefined;
  threatMapping: ThreatMappingOrUndefined;
  threatLanguage: ThreatLanguageOrUndefined;
  concurrentSearches: ConcurrentSearchesOrUndefined;
  itemsPerSearch: ItemsPerSearchOrUndefined;
  timestampOverride: TimestampOverrideOrUndefined;
  to: ToOrUndefined;
  type: TypeOrUndefined;
  references: ReferencesOrUndefined;
  note: NoteOrUndefined;
  version: VersionOrUndefined;
  exceptionsList: ListArrayOrUndefined;
  anomalyThreshold: AnomalyThresholdOrUndefined;
  namespace: NamespaceOrUndefined;
}

export const calculateVersion = (
  immutable: boolean,
  currentVersion: number,
  updateProperties: UpdateProperties
): number => {
  // early return if we are pre-packaged/immutable rule to be safe. We are never responsible
  // for changing the version number of an immutable. Immutables are only responsible for changing
  // their own version number. This would be really bad if an immutable version number is bumped by us
  // due to a bug, hence the extra check and early bail if that is detected.
  if (immutable === true) {
    if (updateProperties.version != null) {
      // we are an immutable rule but we are asking to update the version number so go ahead
      // and update it to what is asked.
      return updateProperties.version;
    } else {
      // we are immutable and not asking to update the version number so return the existing version
      return currentVersion;
    }
  }

  // white list all properties but the enabled/disabled flag. We don't want to auto-increment
  // the version number if only the enabled/disabled flag is being set. Likewise if we get other
  // properties we are not expecting such as updatedAt we do not to cause a version number bump
  // on that either.
  const removedNullValues = removeUndefined(updateProperties);
  if (isEmpty(removedNullValues)) {
    return currentVersion;
  } else {
    return currentVersion + 1;
  }
};

export const removeUndefined = (obj: object) => {
  return pickBy((value: unknown) => value != null, obj);
};

export const calculateName = ({
  updatedName,
  originalName,
}: {
  updatedName: string | undefined;
  originalName: string | undefined;
}): string => {
  if (updatedName != null) {
    return updatedName;
  } else if (originalName != null) {
    return originalName;
  } else {
    // You really should never get to this point. This is a fail safe way to send back
    // the name of "untitled" just in case a rule name became null or undefined at
    // some point since TypeScript allows it.
    return 'untitled';
  }
};

/**
 * Given a throttle from a "security_solution" rule this will transform it into an "alerting" notifyWhen
 * on their saved object.
 * @params throttle The throttle from a "security_solution" rule
 * @returns The correct "NotifyWhen" for a Kibana alerting.
 */
export const transformToNotifyWhen = (
  throttle: string | null | undefined
): AlertNotifyWhenType | null => {
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
  alertAction: AlertAction[] | undefined,
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
  rule: SanitizedAlert<RuleParams>,
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
  id: SanitizedAlert['id'];
  rulesClient: RulesClient;
  muteAll: SanitizedAlert<RuleParams>['muteAll'];
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
 * Determines if rule needs to be migrated from legacy actions
 * and returns necessary pieces for the updated rule
 */
export const legacyMigrate = async ({
  rulesClient,
  savedObjectsClient,
  rule,
}: LegacyMigrateParams): Promise<SanitizedAlert<RuleParams> | null | undefined> => {
  if (rule == null || rule.id == null) {
    return rule;
  }
  /**
   * On update / patch I'm going to take the actions as they are, better off taking rules client.find (siem.notification) result
   * and putting that into the actions array of the rule, then set the rules onThrottle property, notifyWhen and throttle from null -> actualy value (1hr etc..)
   * Then use the rules client to delete the siem.notification
   * Then with the legacy Rule Actions saved object type, just delete it.
   */

  // find it using the references array, not params.ruleAlertId
  const [siemNotification, legacyRuleActionsSO] = await Promise.all([
    rulesClient.find({
      options: {
        hasReference: {
          type: 'alert',
          id: rule.id,
        },
      },
    }),
    savedObjectsClient.find({
      type: legacyRuleActionsSavedObjectType,
      hasReference: {
        type: 'alert',
        id: rule.id,
      },
    }),
  ]);

  if (siemNotification != null && siemNotification.data.length > 0) {
    await Promise.all([
      rulesClient.delete({ id: siemNotification.data[0].id }),
      legacyRuleActionsSO != null && legacyRuleActionsSO.saved_objects.length > 0
        ? savedObjectsClient.delete(
            legacyRuleActionsSavedObjectType,
            legacyRuleActionsSO.saved_objects[0].id
          )
        : null,
    ]);

    const { id, ...restOfRule } = rule;
    const migratedRule = {
      ...restOfRule,
      actions: siemNotification.data[0].actions,
      throttle: siemNotification.data[0].schedule.interval,
      notifyWhen: transformToNotifyWhen(siemNotification.data[0].throttle),
    };
    await rulesClient.update({
      id: rule.id,
      data: migratedRule,
    });
    return { id: rule.id, ...migratedRule };
  }
  return rule;
};
