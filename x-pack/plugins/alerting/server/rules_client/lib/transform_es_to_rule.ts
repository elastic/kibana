/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit, isEmpty } from 'lodash';
import { Logger } from '@kbn/core/server';
import { SavedObjectReference } from '@kbn/core/server';
import { getRuleSnoozeEndTime } from '../../lib';
import { RawRule, PartialRule } from '../../types';
import {
  Rule,
  Monitoring,
  RuleExecutionStatusValues,
  RuleParams,
  fieldsToExcludeFromPublicApi,
} from '../../../common/types/api';
import { RuleAttributes } from '../../common/types';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { injectReferencesIntoActions, injectReferencesIntoParams } from '../common';
import { getActiveScheduledSnoozes } from '../../lib/is_rule_snoozed';

const INITIAL_LAST_RUN_METRICS = {
  duration: 0,
  total_search_duration_ms: null,
  total_indexing_duration_ms: null,
  total_alerts_detected: null,
  total_alerts_created: null,
  gap_duration_s: null,
};

const transformEsExecutionStatus = (
  logger: Logger,
  ruleId: string,
  esRuleExecutionStatus?: RuleAttributes['executionStatus']
): Rule['executionStatus'] | undefined => {
  if (!esRuleExecutionStatus) return undefined;

  const {
    lastExecutionDate,
    lastDuration,
    status = RuleExecutionStatusValues.UNKNOWN,
    error,
    warning,
  } = esRuleExecutionStatus;

  let parsedDateMillis = lastExecutionDate ? Date.parse(lastExecutionDate) : Date.now();
  if (isNaN(parsedDateMillis)) {
    logger.debug(
      `invalid ruleExecutionStatus lastExecutionDate "${lastExecutionDate}" in raw rule ${ruleId}`
    );
    parsedDateMillis = Date.now();
  }
  return {
    status,
    lastExecutionDate: new Date(parsedDateMillis).toISOString(),
    ...(lastDuration != null ? { lastDuration } : {}),
    ...(error ? { error } : {}),
    ...(warning ? { warning } : {}),
  };
};

export const updateMonitoring = ({
  monitoring,
  timestamp,
  duration,
}: {
  monitoring: Monitoring;
  timestamp: string;
  duration?: number;
}): Monitoring => {
  const { run, ...restMonitoring } = monitoring;
  const { last_run: lastRun, ...restRun } = run;
  const { metrics = INITIAL_LAST_RUN_METRICS } = lastRun;

  return {
    ...restMonitoring,
    run: {
      ...restRun,
      last_run: {
        timestamp,
        metrics: {
          ...metrics,
          duration,
        },
      },
    },
  };
};

const transformEsMonitoring = (
  logger: Logger,
  ruleId: string,
  monitoring?: RuleAttributes['monitoring']
): Monitoring | undefined => {
  if (!monitoring) {
    return undefined;
  }

  const lastRunDate = monitoring.run.last_run.timestamp;

  let parsedDateMillis = lastRunDate ? Date.parse(lastRunDate) : Date.now();
  if (isNaN(parsedDateMillis)) {
    logger.debug(`invalid monitoring last_run.timestamp "${lastRunDate}" in raw rule ${ruleId}`);
    parsedDateMillis = Date.now();
  }

  return updateMonitoring({
    monitoring,
    timestamp: new Date(parsedDateMillis).toISOString(),
    duration: monitoring.run.last_run.metrics.duration,
  });
};

interface TransformEsToRuleParams {
  id: Rule['id'];
  logger: Logger;
  ruleType: UntypedNormalizedRuleType;
  references?: SavedObjectReference[];
  excludeFromPublicApi?: boolean;
  includeSnoozeData?: boolean;
  omitGeneratedValues?: boolean;
}

export const transformEsToRule = <Params extends RuleParams = never>(
  esRule: RuleAttributes,
  transformParams: TransformEsToRuleParams
) => {
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
    ...partialEsRule
  } = esRule;

  const {
    id,
    logger,
    ruleType,
    references,
    excludeFromPublicApi = false,
    includeSnoozeData = false,
    omitGeneratedValues = true,
  } = transformParams;

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
        muteAll: partialEsRule.muteAll ?? false,
        snoozeSchedule,
      })?.toISOString()
    : null;
  const includeMonitoring = monitoring && !excludeFromPublicApi;
  const rule = {
    id,
    notifyWhen,
    ...omit(partialEsRule, excludeFromPublicApi ? [...fieldsToExcludeFromPublicApi] : ''),
    schedule,
    actions: (actions
      ? injectReferencesIntoActions(id, actions as RawRule['actions'], references || [])
      : []) as Rule['actions'],
    params: injectReferencesIntoParams(id, ruleType, params, references || []) as Params,
    ...(excludeFromPublicApi ? {} : { snoozeSchedule: snoozeScheduleDates ?? [] }),
    ...(includeSnoozeData && !excludeFromPublicApi
      ? {
          activeSnoozes: getActiveScheduledSnoozes({
            snoozeSchedule,
            muteAll: partialEsRule.muteAll ?? false,
          })?.map((s) => s.id),
          isSnoozedUntil,
        }
      : {}),
    ...(scheduledTaskId ? { scheduledTaskId } : {}),
    ...(executionStatus
      ? { executionStatus: transformEsExecutionStatus(logger, id, executionStatus) }
      : {}),
    ...(includeMonitoring ? { monitoring: transformEsMonitoring(logger, id, monitoring) } : {}),
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
      rule.actions = rule.actions.map((ruleAction) => omit(ruleAction, 'alertsFilter.query.dsl'));
    }
  }

  if (!excludeFromPublicApi) {
    const viewInAppRelativeUrl =
      ruleType.getViewInAppRelativeUrl &&
      ruleType.getViewInAppRelativeUrl({ rule: rule as PartialRule<Params> });
    if (viewInAppRelativeUrl) {
      (rule as PartialRule<Params>).viewInAppRelativeUrl = viewInAppRelativeUrl;
    }
  }

  return rule as Rule<Params>;
};
