/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import { RulesClientContext } from '../types';
import { ScheduleTaskOptions } from '../types';

export async function scheduleAdHocTask(context: RulesClientContext, opts: ScheduleTaskOptions) {
  const { id, consumer, ruleTypeId, throwOnConflict, from, to } = opts;
  if (!from || !to) {
    throw new Error(`Invalid parameters: from=${from}, to=${to}!`);
  }
  const taskInstance = {
    taskType: `alerting:${ruleTypeId}`,
    params: {
      alertId: id,
      spaceId: context.spaceId,
      consumer,
      adHocIntervalFrom: from,
      adHocIntervalTo: to,
    },
    state: {
      previousStartedAt: null,
      alertTypeState: {},
      alertInstances: {},
    },
    scope: ['alerting'],
    enabled: true,
  };
  try {
    return await withSpan({ name: 'taskManager.schedule', type: 'rules' }, () =>
      context.taskManager.schedule(taskInstance)
    );
  } catch (err) {
    if (err.statusCode === 409 && !throwOnConflict) {
      return taskInstance;
    }
    throw err;
  }
}
