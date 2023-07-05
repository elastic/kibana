/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit, isEmpty } from 'lodash';
import { Logger } from '@kbn/core/server';
import { SavedObjectReference } from '@kbn/core/server';
import { ruleExecutionStatusValues } from '../constants';
import { getRuleSnoozeEndTime } from '../../../lib';
import { RuleDomain, Monitoring, RuleParams } from '../types';
import { RuleAttributes } from '../../../data/rule/types';
import { RawRule, PartialRule } from '../../../types';
import { UntypedNormalizedRuleType } from '../../../rule_type_registry';
import {
  injectReferencesIntoActions,
  injectReferencesIntoParams,
} from '../../../rules_client/common';
import { getActiveScheduledSnoozes } from '../../../lib/is_rule_snoozed';

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
  esRuleExecutionStatus: RuleAttributes['executionStatus']
): RuleDomain['executionStatus'] => {
  const {
    lastExecutionDate,
    lastDuration,
    status = ruleExecutionStatusValues.UNKNOWN,
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
    lastExecutionDate: new Date(parsedDateMillis),
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
  id: RuleDomain['id'];
  logger: Logger;
  ruleType: UntypedNormalizedRuleType;
  references?: SavedObjectReference[];
  includeSnoozeData?: boolean;
  omitGeneratedValues?: boolean;
}

export const transformRuleAttributesToRuleDomain = <Params extends RuleParams = never>(
  esRule: RuleAttributes,
  transformParams: TransformEsToRuleParams
): RuleDomain<Params> => {
  const { scheduledTaskId, executionStatus, monitoring, snoozeSchedule, lastRun } = esRule;

  const {
    id,
    logger,
    ruleType,
    references,
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
  const includeSnoozeSchedule = snoozeSchedule !== undefined && !isEmpty(snoozeSchedule);
  const isSnoozedUntil = includeSnoozeSchedule
    ? getRuleSnoozeEndTime({
        muteAll: esRule.muteAll ?? false,
        snoozeSchedule,
      })?.toISOString()
    : null;

  let actions = esRule.actions
    ? injectReferencesIntoActions(id, esRule.actions as RawRule['actions'], references || [])
    : [];

  if (omitGeneratedValues) {
    actions = actions.map((ruleAction) => omit(ruleAction, 'alertsFilter.query.dsl'));
  }

  const params = injectReferencesIntoParams<Params, RuleParams>(
    id,
    ruleType,
    esRule.params,
    references || []
  );

  const activeSnoozes = getActiveScheduledSnoozes({
    snoozeSchedule,
    muteAll: esRule.muteAll ?? false,
  })?.map((s) => s.id);

  const rule = {
    id,
    enabled: esRule.enabled,
    name: esRule.name,
    tags: esRule.tags,
    alertTypeId: esRule.alertTypeId,
    consumer: esRule.consumer,
    schedule: esRule.schedule,
    actions: actions as RuleDomain['actions'],
    params,
    mapped_params: esRule.mapped_params,
    ...(scheduledTaskId ? { scheduledTaskId } : {}),
    createdBy: esRule.createdBy,
    updatedBy: esRule.updatedBy,
    createdAt: new Date(esRule.createdAt),
    updatedAt: new Date(esRule.updatedAt),
    apiKey: esRule.apiKey,
    apiKeyOwner: esRule.apiKeyOwner,
    apiKeyCreatedByUser: esRule.apiKeyCreatedByUser,
    throttle: esRule.throttle,
    muteAll: esRule.muteAll,
    notifyWhen: esRule.notifyWhen,
    mutedInstanceIds: esRule.mutedInstanceIds,
    executionStatus: transformEsExecutionStatus(logger, id, executionStatus),
    ...(monitoring ? { monitoring: transformEsMonitoring(logger, id, monitoring) } : {}),
    snoozeSchedule: snoozeScheduleDates ?? [],
    ...(includeSnoozeData
      ? {
          activeSnoozes,
          ...(isSnoozedUntil !== undefined
            ? { isSnoozedUntil: isSnoozedUntil ? new Date(isSnoozedUntil) : null }
            : {}),
        }
      : {}),
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
    ...(esRule.nextRun ? { nextRun: new Date(esRule.nextRun) } : {}),
    revision: esRule.revision,
    running: esRule.running,
  };

  // Bad casts, but will fix once we fix all rule types
  const viewInAppRelativeUrl =
    ruleType.getViewInAppRelativeUrl &&
    ruleType.getViewInAppRelativeUrl({ rule: rule as unknown as PartialRule<Params> });
  if (viewInAppRelativeUrl) {
    (rule as unknown as PartialRule<Params>).viewInAppRelativeUrl = viewInAppRelativeUrl;
  }

  // Remove all undefined keys to clean up the object
  type RuleKeys = keyof Omit<RuleDomain, 'viewInAppRelativeUrl'>;
  for (const key in rule) {
    if (rule[key as RuleKeys] === undefined) {
      delete rule[key as RuleKeys];
    }
  }

  return rule;
};
