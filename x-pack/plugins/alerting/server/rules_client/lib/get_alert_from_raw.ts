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
import { ruleExecutionStatusFromRaw, convertMonitoringFromRawAndVerify } from '../../lib';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { getActiveScheduledSnoozes } from '../../lib/is_rule_snoozed';
import {
  calculateIsSnoozedUntil,
  injectReferencesIntoActions,
  injectReferencesIntoParams,
} from '../common';
import { RulesClientContext } from '../types';

export interface GetAlertFromRawParams {
  id: string;
  ruleTypeId: string;
  rawRule: RawRule;
  references: SavedObjectReference[] | undefined;
  includeLegacyId?: boolean;
  excludeFromPublicApi?: boolean;
  includeSnoozeData?: boolean;
}

export function getAlertFromRaw<Params extends RuleTypeParams>(
  context: RulesClientContext,
  id: string,
  ruleTypeId: string,
  rawRule: RawRule,
  references: SavedObjectReference[] | undefined,
  includeLegacyId: boolean = false,
  excludeFromPublicApi: boolean = false,
  includeSnoozeData: boolean = false
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
    includeSnoozeData
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
    ...partialRawRule
  }: Partial<RawRule>,
  references: SavedObjectReference[] | undefined,
  includeLegacyId: boolean = false,
  excludeFromPublicApi: boolean = false,
  includeSnoozeData: boolean = false
): PartialRule<Params> | PartialRuleWithLegacyId<Params> {
  const snoozeScheduleDates = snoozeSchedule?.map((s) => ({
    ...s,
    rRule: {
      ...s.rRule,
      dtstart: new Date(s.rRule.dtstart),
      ...(s.rRule.until ? { until: new Date(s.rRule.until) } : {}),
    },
  }));
  const includeSnoozeSchedule =
    snoozeSchedule !== undefined && !isEmpty(snoozeSchedule) && !excludeFromPublicApi;
  const isSnoozedUntil = includeSnoozeSchedule
    ? calculateIsSnoozedUntil({
        muteAll: partialRawRule.muteAll ?? false,
        snoozeSchedule,
      })
    : null;
  const includeMonitoring = monitoring && !excludeFromPublicApi;
  const rule = {
    id,
    notifyWhen,
    ...omit(partialRawRule, excludeFromPublicApi ? [...context.fieldsToExcludeFromPublicApi] : ''),
    // we currently only support the Interval Schedule type
    // Once we support additional types, this type signature will likely change
    schedule: schedule as IntervalSchedule,
    actions: actions ? injectReferencesIntoActions(id, actions, references || []) : [],
    params: injectReferencesIntoParams(id, ruleType, params, references || []) as Params,
    ...(excludeFromPublicApi ? {} : { snoozeSchedule: snoozeScheduleDates ?? [] }),
    ...(includeSnoozeData && !excludeFromPublicApi
      ? {
          activeSnoozes: getActiveScheduledSnoozes({
            snoozeSchedule,
            muteAll: partialRawRule.muteAll ?? false,
          })?.map((s) => s.id),
          isSnoozedUntil,
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
  };

  return includeLegacyId
    ? ({ ...rule, legacyId } as PartialRuleWithLegacyId<Params>)
    : (rule as PartialRule<Params>);
}
