/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import {
  parseDuration,
  RuleAction,
  RuleNotifyWhenTypeValues,
  ThrottledActions,
} from '../../common';

export const isSummaryAction = (action: RuleAction) => {
  return action.frequency?.summary || false;
};

export const isSummaryActionOnInterval = (action: RuleAction) => {
  if (!action.frequency) {
    return false;
  }
  return (
    action.frequency.notifyWhen === RuleNotifyWhenTypeValues[2] &&
    typeof action.frequency.throttle === 'string'
  );
};

export const isSummaryActionPerRuleRun = (action: RuleAction) => {
  if (!action.frequency) {
    return false;
  }
  return (
    action.frequency.notifyWhen === RuleNotifyWhenTypeValues[1] &&
    typeof action.frequency.throttle !== 'string'
  );
};

export const isSummaryActionThrottled = ({
  action,
  summaryActions,
  logger,
}: {
  action: RuleAction;
  summaryActions?: ThrottledActions;
  logger: Logger;
}) => {
  if (!isSummaryActionOnInterval(action)) {
    return false;
  }
  if (!summaryActions) {
    return false;
  }
  const hash = generateActionHash(action);
  const triggeredSummaryAction = summaryActions[hash];
  if (!triggeredSummaryAction) {
    return false;
  }
  const throttleMills = parseDuration(action.frequency!.throttle!);
  const throttled = triggeredSummaryAction.date.getTime() + throttleMills > Date.now();

  if (throttled) {
    logger.debug(
      `skipping scheduling the action '${action.actionTypeId}:${action.id}', summary action is still being throttled`
    );
  }
  return throttled;
};

export const generateActionHash = (action: RuleAction) => {
  return `${action.actionTypeId}:${action.group || 'summary'}:${
    action.frequency?.throttle || 'no-throttling'
  }`;
};

export const getSummaryActionsFromTaskState = ({
  actions,
  summaryActions = {},
}: {
  actions: RuleAction[];
  summaryActions?: ThrottledActions;
}) => {
  return Object.entries(summaryActions).reduce((newObj, [key, val]) => {
    const actionExists = actions.some((action) => generateActionHash(action) === key);
    if (actionExists) {
      return { ...newObj, [key]: val };
    } else {
      return newObj;
    }
  }, {});
};
