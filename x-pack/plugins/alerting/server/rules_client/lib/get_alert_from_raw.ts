/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, isEmpty } from 'lodash';
import { SavedObjectReference } from '@kbn/core/server';
import {
  Rule,
  PartialRule,
  RawRule,
  IntervalSchedule,
  RuleTypeParams,
  RuleWithLegacyId,
  PartialRuleWithLegacyId,
} from '../../types';
import {
  ruleExecutionStatusFromRaw,
  convertMonitoringFromRawAndVerify,
  getRuleSnoozeEndTime,
} from '../../lib';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { getActiveScheduledSnoozes } from '../../lib/is_rule_snoozed';
import { injectReferencesIntoParams } from '../common';
import { RulesClientContext } from '../types';
import {
  transformRawActionsToDomainActions,
  transformRawActionsToDomainSystemActions,
} from '../../application/rule/transforms/transform_raw_actions_to_domain_actions';

export interface GetAlertFromRawParams {
  id: string;
  ruleTypeId: string;
  rawRule: RawRule;
  references: SavedObjectReference[] | undefined;
  includeLegacyId?: boolean;
  excludeFromPublicApi?: boolean;
  includeSnoozeData?: boolean;
  omitGeneratedValues?: boolean;
}

/**
 * @deprecated in favor of transformRuleAttributesToRuleDomain
 */
export function getAlertFromRaw<Params extends RuleTypeParams>(
  context: RulesClientContext,
  id: string,
  ruleTypeId: string,
  rawRule: RawRule,
  references: SavedObjectReference[] | undefined,
  includeLegacyId: boolean = false,
  excludeFromPublicApi: boolean = false,
  includeSnoozeData: boolean = false,
  omitGeneratedValues: boolean = true
): Rule | RuleWithLegacyId {
  const ruleType = context.ruleTypeRegistry.get(ruleTypeId);
  // In order to support the partial update API of Saved Objects we have to support
  // partial updates of an Alert, but when we receive an actual RawRule, it is safe
  // to cast the result to an Alert
  const res = getPartialRuleFromRaw<Params>(
    context,
    id,
    ruleType,
    rawRule,
    references,
    includeLegacyId,
    excludeFromPublicApi,
    includeSnoozeData,
    omitGeneratedValues
  );
  // include to result because it is for internal rules client usage
  if (includeLegacyId) {
    return res as RuleWithLegacyId;
  }
  // exclude from result because it is an internal variable
  return omit(res, ['legacyId']) as Rule;
}

export function getPartialRuleFromRaw<Params extends RuleTypeParams>(
  context: RulesClientContext,
  id: string,
  ruleType: UntypedNormalizedRuleType,
  {
    createdAt,
    updatedAt,
    meta,
    notifyWhen,
    legacyId,
    scheduledTaskId,
    params,
    executionStatus,
    monitoring,
    nextRun,
    schedule,
    actions,
    snoozeSchedule,
    lastRun,
    isSnoozedUntil: DoNotUseIsSNoozedUntil,
    ...partialRawRule
  }: Partial<RawRule>,
  references: SavedObjectReference[] | undefined,
  includeLegacyId: boolean = false,
  excludeFromPublicApi: boolean = false,
  includeSnoozeData: boolean = false,
  omitGeneratedValues: boolean = true
): PartialRule<Params> | PartialRuleWithLegacyId<Params> {
  const snoozeScheduleDates = snoozeSchedule?.map((s) => ({
    ...s,
    rRule: {
      ...s.rRule,
      dtstart: new Date(s.rRule.dtstart).toISOString(),
      ...(s.rRule.until ? { until: new Date(s.rRule.until).toISOString() } : {}),
    },
  }));
  const includeSnoozeSchedule =
    snoozeSchedule !== undefined && !isEmpty(snoozeSchedule) && !excludeFromPublicApi;
  const isSnoozedUntil = includeSnoozeSchedule
    ? getRuleSnoozeEndTime({
        muteAll: partialRawRule.muteAll ?? false,
        snoozeSchedule,
      })
    : null;
  const includeMonitoring = monitoring && !excludeFromPublicApi;

  const rule: PartialRule<Params> = {
    id,
    notifyWhen,
    ...omit(partialRawRule, excludeFromPublicApi ? [...context.fieldsToExcludeFromPublicApi] : ''),
    // we currently only support the Interval Schedule type
    // Once we support additional types, this type signature will likely change
    schedule: schedule as IntervalSchedule,
    actions: actions
      ? transformRawActionsToDomainActions({
          ruleId: id,
          actions,
          references: references || [],
          isSystemAction: context.isSystemAction,
          omitGeneratedValues,
        })
      : [],
    systemActions: actions
      ? transformRawActionsToDomainSystemActions({
          ruleId: id,
          actions,
          references: references || [],
          isSystemAction: context.isSystemAction,
          omitGeneratedValues,
        })
      : [],
    params: injectReferencesIntoParams(id, ruleType, params, references || []) as Params,
    ...(excludeFromPublicApi ? {} : { snoozeSchedule: snoozeScheduleDates ?? [] }),
    ...(includeSnoozeData && !excludeFromPublicApi
      ? {
          activeSnoozes: getActiveScheduledSnoozes({
            snoozeSchedule,
            muteAll: partialRawRule.muteAll ?? false,
          })?.map((s) => s.id),
          isSnoozedUntil: isSnoozedUntil as PartialRule['isSnoozedUntil'],
        }
      : {}),
    ...(updatedAt ? { updatedAt: new Date(updatedAt) } : {}),
    ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
    ...(scheduledTaskId ? { scheduledTaskId } : {}),
    ...(executionStatus
      ? { executionStatus: ruleExecutionStatusFromRaw(context.logger, id, executionStatus) }
      : {}),
    ...(includeMonitoring
      ? { monitoring: convertMonitoringFromRawAndVerify(context.logger, id, monitoring) }
      : {}),
    ...(nextRun ? { nextRun: new Date(nextRun) } : {}),
    ...(lastRun
      ? {
          lastRun: {
            ...lastRun,
            ...(lastRun.outcomeMsg && !Array.isArray(lastRun.outcomeMsg)
              ? { outcomeMsg: lastRun.outcomeMsg ? [lastRun.outcomeMsg] : null }
              : { outcomeMsg: lastRun.outcomeMsg }),
          },
        }
      : {}),
  };

  if (omitGeneratedValues) {
    if (rule.actions) {
      rule.actions = rule.actions.map((ruleAction) => {
        return omit(ruleAction, 'alertsFilter.query.dsl');
      });
    }
  }

  // Need the `rule` object to build a URL
  if (!excludeFromPublicApi) {
    const viewInAppRelativeUrl =
      ruleType.getViewInAppRelativeUrl && ruleType.getViewInAppRelativeUrl({ rule });
    if (viewInAppRelativeUrl) {
      rule.viewInAppRelativeUrl = viewInAppRelativeUrl;
    }
  }

  if (includeLegacyId) {
    const result: PartialRuleWithLegacyId<Params> = {
      ...rule,
      legacyId,
    };
    return result;
  }

  return rule;
}
