/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, isEmpty } from 'lodash';
import { Logger, SavedObjectReference } from '@kbn/core/server';
import {
  Rule,
  PartialRule,
  RawRule,
  IntervalSchedule,
  RuleTypeParams,
  RuleWithLegacyId,
  PartialRuleWithLegacyId,
  RuleTypeRegistry,
} from '../../types';
import {
  ruleExecutionStatusFromRaw,
  convertMonitoringFromRawAndVerify,
  getRuleSnoozeEndTime,
} from '../../lib';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { getActiveScheduledSnoozes } from '../../lib/is_rule_snoozed';
import { injectReferencesIntoParams } from '../common';
import {
  transformRawActionsToDomainActions,
  transformRawActionsToDomainSystemActions,
} from '../../application/rule/transforms/transform_raw_actions_to_domain_actions';
import { fieldsToExcludeFromPublicApi } from '../rules_client';

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

interface GetAlertFromRawOpts {
  excludeFromPublicApi?: boolean;
  id: string;
  includeLegacyId?: boolean;
  includeSnoozeData?: boolean;
  isSystemAction: (actionId: string) => boolean;
  logger: Logger;
  omitGeneratedValues?: boolean;
  rawRule: RawRule;
  references: SavedObjectReference[] | undefined;
  ruleTypeId: string;
  ruleTypeRegistry: RuleTypeRegistry;
}

type GetPartialRuleFromRawOpts = Omit<GetAlertFromRawOpts, 'ruleTypeRegistry'> & {
  ruleType: UntypedNormalizedRuleType;
};
/**
 * @deprecated in favor of transformRuleAttributesToRuleDomain
 */
export function getAlertFromRaw<Params extends RuleTypeParams>(
  opts: GetAlertFromRawOpts
): Rule | RuleWithLegacyId {
  const {
    excludeFromPublicApi = false,
    includeLegacyId = false,
    includeSnoozeData = false,
    omitGeneratedValues = true,
  } = opts;
  const ruleType = opts.ruleTypeRegistry.get(opts.ruleTypeId);
  // In order to support the partial update API of Saved Objects we have to support
  // partial updates of an Alert, but when we receive an actual RawRule, it is safe
  // to cast the result to an Alert
  const res = getPartialRuleFromRaw<Params>({
    excludeFromPublicApi,
    id: opts.id,
    includeLegacyId,
    includeSnoozeData,
    isSystemAction: opts.isSystemAction,
    logger: opts.logger,
    omitGeneratedValues,
    rawRule: opts.rawRule,
    references: opts.references,
    ruleTypeId: opts.ruleTypeId,
    ruleType,
  });
  // include to result because it is for internal rules client usage
  if (includeLegacyId) {
    return res as RuleWithLegacyId;
  }
  // exclude from result because it is an internal variable
  return omit(res, ['legacyId']) as Rule;
}

function getPartialRuleFromRaw<Params extends RuleTypeParams>(
  opts: GetPartialRuleFromRawOpts
): PartialRule<Params> | PartialRuleWithLegacyId<Params> {
  const {
    excludeFromPublicApi = false,
    includeLegacyId = false,
    includeSnoozeData = false,
    omitGeneratedValues = true,
    rawRule,
  } = opts;

  const {
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
    isSnoozedUntil: DoNotUseIsSnoozedUntil,
    ...partialRawRule
  } = rawRule;

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
    id: opts.id,
    notifyWhen,
    ...omit(partialRawRule, excludeFromPublicApi ? [...fieldsToExcludeFromPublicApi] : ''),
    // we currently only support the Interval Schedule type
    // Once we support additional types, this type signature will likely change
    schedule: schedule as IntervalSchedule,
    actions: actions
      ? transformRawActionsToDomainActions({
          ruleId: opts.id,
          actions,
          references: opts.references || [],
          isSystemAction: opts.isSystemAction,
          omitGeneratedValues,
        })
      : [],
    systemActions: actions
      ? transformRawActionsToDomainSystemActions({
          ruleId: opts.id,
          actions,
          references: opts.references || [],
          isSystemAction: opts.isSystemAction,
          omitGeneratedValues,
        })
      : [],
    params: injectReferencesIntoParams(
      opts.id,
      opts.ruleType,
      params,
      opts.references || []
    ) as Params,
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
      ? { executionStatus: ruleExecutionStatusFromRaw(opts.logger, opts.id, executionStatus) }
      : {}),
    ...(includeMonitoring
      ? { monitoring: convertMonitoringFromRawAndVerify(opts.logger, opts.id, monitoring) }
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
      opts.ruleType.getViewInAppRelativeUrl && opts.ruleType.getViewInAppRelativeUrl({ rule });
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
