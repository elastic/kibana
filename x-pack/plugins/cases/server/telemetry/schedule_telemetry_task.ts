/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { CASES_TELEMETRY_TASK_NAME } from '../../common/constants';

const MINUTES_ON_HALF_DAY = 60 * 12;

export const scheduleCasesTelemetryTask = (
  taskManager: TaskManagerStartContract,
  logger: Logger
) => {
  taskManager
    .ensureScheduled({
      id: CASES_TELEMETRY_TASK_NAME,
      taskType: CASES_TELEMETRY_TASK_NAME,
      schedule: {
        interval: `${MINUTES_ON_HALF_DAY}m`,
      },
      scope: ['cases'],
      params: {},
      state: {},
    })
    .catch((err) =>
      logger.debug(
        `Error scheduling cases task with ID ${CASES_TELEMETRY_TASK_NAME} and type ${CASES_TELEMETRY_TASK_NAME}. Received ${err.message}`
      )
    );
};
