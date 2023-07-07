/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration } from '../../../common/parse_duration';
import { RawRule, RuleNotifyWhen } from '../../types';

/**
 * Validate that updated schedule interval is not longer than any of the existing action frequencies
 * @param schedule Schedule interval that user tries to set
 * @param actions Rule actions
 */
export function validateScheduleOperation(
  schedule: RawRule['schedule'],
  actions: RawRule['actions'],
  ruleId: string
): void {
  const scheduleInterval = parseDuration(schedule.interval);
  const actionsWithInvalidThrottles = [];

  for (const action of actions) {
    // check for actions throttled shorter than the rule schedule
    if (
      action.frequency?.notifyWhen === RuleNotifyWhen.THROTTLE &&
      parseDuration(action.frequency.throttle!) < scheduleInterval
    ) {
      actionsWithInvalidThrottles.push(action);
    }
  }

  if (actionsWithInvalidThrottles.length > 0) {
    throw Error(
      `Error updating rule with ID "${ruleId}": the interval ${schedule.interval} is longer than the action frequencies`
    );
  }
}
