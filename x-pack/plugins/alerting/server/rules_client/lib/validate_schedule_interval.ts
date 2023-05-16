/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration } from '../../../common/parse_duration';
import { RulesClientContext } from '../types';

export function validateScheduleInterval(
  context: RulesClientContext,
  scheduleInterval: string,
  ruleTypeId: string,
  ruleId: string
): void {
  if (!scheduleInterval) {
    return;
  }
  const isIntervalInvalid = parseDuration(scheduleInterval) < context.minimumScheduleIntervalInMs;
  if (isIntervalInvalid && context.minimumScheduleInterval.enforce) {
    throw Error(
      `Error updating rule: the interval is less than the allowed minimum interval of ${context.minimumScheduleInterval.value}`
    );
  } else if (isIntervalInvalid && !context.minimumScheduleInterval.enforce) {
    context.logger.warn(
      `Rule schedule interval (${scheduleInterval}) for "${ruleTypeId}" rule type with ID "${ruleId}" is less than the minimum value (${context.minimumScheduleInterval.value}). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent such changes.`
    );
  }
}
