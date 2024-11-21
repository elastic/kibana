/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { IEventLogger } from '@kbn/event-log-plugin/server';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { AlertingEventLogger } from '../alerting_event_logger/alerting_event_logger';
import { findGapsByRuleId } from './find_gaps_by_rule_id';
import { RuleGap } from './types'; 
import { AdHocRunSO } from '../../data/ad_hoc_run/types';

/**
 * Fill the gap with the interval
 */
const fillGap = async ({
  gap,
}: {
  gap: RuleGap;
}) => {

  gap.status = // ..
  gap.filled_intervals = // ...
  gap.in_progress_intervals = // ...
  gap.unfilled_intervals = // ...

  return gap;
};



/**
 * Find all overlapping backfill tasks and update the gap status accordingly
 */
const updateGapStatus = async ({
  gap,
  savedObjectsClient,
  ruleId,
}: {
  gap: RuleGap;
  savedObjectsClient: ISavedObjectsRepository;
  ruleId: string;
}) => {


  const backfillResults = await savedObjectsClient.find<AdHocRunSO>({
    type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
    hasReference: {
      type: RULE_SAVED_OBJECT_TYPE,
      id: ruleId,
    },
    // Filter for backfills that overlap with our interval
    filter: `
    ad_hoc_run_params.attributes.start <= "${gap.range.lte}" and 
    ad_hoc_run_params.attributes.end >= "${gap.range.gte}"
  `,
    page: 1,
    perPage: 100,
  });

  const hasPendingOverlapingTasks =  // backfillResults.......;
  
  if (hasPendingOverlapingTasks && gap.status !== "FILLED") {
    gap.status = "IN_PROGRESS";
    gap.in_progress_intervals = //..[]
    gap.unfilled_intervals = //... []
  }


  return gap;

}
export async function processGapsAfterExecution(params: {
  ruleId: string;
  executedInterval: { from: Date; to: Date };
  alertingEventLogger: AlertingEventLogger;
  eventLog: IEventLogger;
  savedObjectsClient: ISavedObjectsRepository;
  logger: Logger;
  needToFillGaps: boolean;
}): Promise<void> {
  const {
    ruleId,
    executedInterval,
    alertingEventLogger,
    logger,
    savedObjectsClient,
    eventLog,
    needToFillGaps,
  } = params;

  try {
    const allGaps = await findGapsByRuleId({
      ruleId,
      timeRange: executedInterval,
      eventLog,
      logger,
    });

    for (const gap of allGaps) {
      let newGap = needToFillGaps ? fillGap(gap) : gap;

      const updatedGap = await updateGapStatus({
        gap: newGap,
        savedObjectsClient,
        ruleId,
      });

      await alertingEventLogger.updateGap(updatedGap);
    }
   
  } catch (err) {
    logger.error(`Failed to process gaps for rule ${ruleId}: ${err.message}`);
    throw err;
  }
}
