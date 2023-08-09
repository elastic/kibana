/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import { type Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

import type { Range } from '../../../../common/risk_engine';

export const convertDateToISOString = (dateString: string): string => {
  const date = datemath.parse(dateString);

  if (date?.isValid()) {
    return date.toISOString();
  } else {
    throw new Error(`Could not convert string "${dateString}" to ISO string`);
  }
};

export const convertRangeToISO = (range: Range): Range => ({
  start: convertDateToISOString(range.start),
  end: convertDateToISOString(range.end),
});

export const removeRiskScoringTask = async ({
  logger,
  taskManager,
  taskId,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  taskId: string;
}) => {
  try {
    await taskManager.remove(taskId);
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(`Failed to remove risk scoring task: ${err.message}`);
      throw err;
    }
  }
};
