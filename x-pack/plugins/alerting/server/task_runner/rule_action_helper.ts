/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import {
  IntervalSchedule,
  parseDuration,
  RuleAction,
  RuleNotifyWhenTypeValues,
  ThrottledActions,
} from '../../common';

export const isSummaryAction = (action?: RuleAction) => {
  return action?.frequency?.summary ?? false;
};

export const isActionOnInterval = (action?: RuleAction) => {
  if (action?.frequency == null) {
    return false;
  }
  return (
    action?.frequency.notifyWhen === RuleNotifyWhenTypeValues[2] &&
    typeof action?.frequency.throttle === 'string'
  );
};

export const isSummaryActionOnInterval = (action: RuleAction) => {
  return isActionOnInterval(action) && action.frequency?.summary;
};

export const isSummaryActionThrottled = ({
  action,
  throttledSummaryActions,
  logger,
}: {
  action?: RuleAction;
  throttledSummaryActions?: ThrottledActions;
  logger: Logger;
}) => {
  if (!isActionOnInterval(action)) {
    return false;
  }

  if (!throttledSummaryActions) {
    return false;
  }

  const throttledAction = throttledSummaryActions[action?.uuid!];

  if (!throttledAction) {
    return false;
  }

  let throttleMills = 0;

  try {
    throttleMills = parseDuration(action?.frequency!.throttle!);
  } catch (e) {
    logger.debug(`Action'${action?.actionTypeId}:${action?.id}', has an invalid throttle interval`);
  }

  const throttled = new Date(throttledAction.date).getTime() + throttleMills > Date.now();

  if (throttled) {
    logger.debug(
      `skipping scheduling the action '${action?.actionTypeId}:${action?.id}', summary action is still being throttled`
    );
  }
  return throttled;
};

export const generateActionHash = (action?: RuleAction) => {
  return `${action?.actionTypeId || 'no-action-type-id'}:${
    action?.frequency?.summary ? 'summary' : action?.group || 'no-action-group'
  }:${action?.frequency?.throttle || 'no-throttling'}`;
};

export const getSummaryActionsFromTaskState = ({
  actions,
  summaryActions = {},
}: {
  actions: RuleAction[];
  summaryActions?: ThrottledActions;
}) => {
  return Object.entries(summaryActions).reduce((newObj, [key, val]) => {
    const actionExists = actions.find(
      (action) =>
        action.frequency?.summary && (action.uuid === key || generateActionHash(action) === key)
    );

    if (actionExists) {
      // replace hash with uuid
      newObj[actionExists.uuid!] = val;
    }
    return newObj;
  }, {} as ThrottledActions);
};

export const getSummaryActionTimeBounds = (
  action: RuleAction,
  ruleSchedule: IntervalSchedule,
  previousStartedAt: Date | null
): { start?: number; end?: number } => {
  if (!isSummaryAction(action)) {
    return { start: undefined, end: undefined };
  }

  let startDate: Date;
  const now = Date.now();

  if (isActionOnInterval(action)) {
    // If action is throttled, set time bounds using throttle interval
    const throttleMills = parseDuration(action.frequency!.throttle!);
    startDate = new Date(now - throttleMills);
  } else {
    // If action is not throttled, set time bounds to previousStartedAt - now
    // If previousStartedAt is null, use the rule schedule interval
    if (previousStartedAt) {
      startDate = previousStartedAt;
    } else {
      const scheduleMillis = parseDuration(ruleSchedule.interval);
      startDate = new Date(now - scheduleMillis);
    }
  }

  return { start: startDate.valueOf(), end: now.valueOf() };
};
