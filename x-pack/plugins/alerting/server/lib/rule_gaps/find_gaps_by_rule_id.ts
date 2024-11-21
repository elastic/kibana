/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogger } from '@kbn/event-log-plugin/server';
import { Logger } from '@kbn/core/server';
export async function findGapsByRuleId(params: {
  ruleId: string;
  timeRange?: { from: string; to: string };
  eventLog: IEventLogger;
  logger: Logger;
}): Promise<[]> {
  const { ruleId, timeRange, eventLog, logger } = params;

  try {
    // return await eventLogeventLog.findEvents({
    // });
    return [];
  } catch (err) {
    logger.error(`Failed to find gaps for rule ${ruleId}: ${err.message}`);
    throw err;
  }
}
