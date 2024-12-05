/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogger } from '@kbn/event-log-plugin/server';
import { Logger } from '@kbn/core/server';

export async function getTotalUnfilledGapDuration(params: {
  ruleId: string;
  timeRange?: { from: string; to: string };
  eventLog: IEventLogger;
  logger: Logger;
}): Promise<{
  unfiled_gap_duration_ms: {
    '1d': number;
    '3d': number;
    '7d': number;
  };
}> {
  const { ruleId, timeRange, eventLog, logger } = params;

  try {
    const aggs = {}; // eventLog...
    return {
      unfiled_gap_duration_ms: {
        '1d': 0,
        '3d': 0,
        '7d': 0,
      },
    };
  } catch (err) {
    logger.error(`Failed to find unffiled gap duration for rule ${ruleId}: ${err.message}`);
    throw err;
  }
}
