/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { IEventLogClient, IEventLogger } from '@kbn/event-log-plugin/server';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { AlertingEventLogger } from '../alerting_event_logger/alerting_event_logger';
import { findAllGaps } from './find_gaps';
import { Gap } from './gap';
import { AdHocRunSO } from '../../data/ad_hoc_run/types';
import { adHocRunStatus, gapStatus } from '../../../common/constants';
import { parseDuration } from '../../../common';
import { transformAdHocRunToBackfillResult } from '../../application/backfill/transforms';

/**
 * Find all overlapping backfill tasks and update the gap status accordingly
 */
const updateGapStatus = async ({
  gap,
  savedObjectsClient,
  ruleId,
}: {
  gap: Gap;
  savedObjectsClient: ISavedObjectsRepository;
  ruleId: string;
}): Promise<Gap> => {
  // TODO: get all backfill, not first page
  const { saved_objects: backfillSOs } = await savedObjectsClient.find<AdHocRunSO>({
    type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
    hasReference: {
      type: RULE_SAVED_OBJECT_TYPE,
      id: ruleId,
    },
    // Filter for backfills that overlap with our interval
    filter: `
    ad_hoc_run_params.attributes.start <= "${gap.range.lte.toISOString()}" and 
    ad_hoc_run_params.attributes.end >= "${gap.range.gte.toISOString()}"
  `,
    page: 1,
    perPage: 10000,
  });

  // TODO: Extract backfill transform to another function, to reuse in API
  const transformedBackfills = backfillSOs.map((data) => transformAdHocRunToBackfillResult(data));

  for (const backfill of transformedBackfills) {
    if ('error' in backfill) {
      break;
    }
    const backfillScheduleIntervals = backfill?.schedule ?? [];
    for (const scheduleItem of backfillScheduleIntervals) {
      const runAt = new Date(scheduleItem.runAt).getTime();
      const intervalDuration = parseDuration(scheduleItem.interval);
      const from = runAt - intervalDuration;
      const to = runAt;
      const scheduleInterval = {
        gte: new Date(from).toISOString(),
        lte: new Date(to).toISOString(),
      };
      if (
        scheduleItem.status === adHocRunStatus.PENDING ||
        scheduleItem.status === adHocRunStatus.RUNNING
      ) {
        gap.addInProgress(scheduleInterval);
      }
    }
  }

  return gap;
};

export async function updateGaps(params: {
  ruleId: string;
  start: Date;
  end: Date;
  eventLogger: IEventLogger;
  eventLogClient: IEventLogClient;
  savedObjectsClient: ISavedObjectsRepository;
  logger: Logger;
  needToFillGaps: boolean;
}): Promise<void> {
  const {
    ruleId,
    start,
    end,
    logger,
    savedObjectsClient,
    eventLogClient,
    needToFillGaps,
    eventLogger,
  } = params;

  const alertingEventLogger = new AlertingEventLogger(eventLogger);

  try {
    const allGaps = await findAllGaps({
      eventLogClient,
      logger,
      params: {
        ruleIds: [ruleId],
        start,
        end,
        statuses: [gapStatus.PARTIALLY_FILLED, gapStatus.UNFILLED],
      },
    });

    console.log('start/endn', start, end);

    console.log('needTofilleGap', needToFillGaps);
    console.log('allGaps', allGaps.length);
    console.log('gaps', JSON.stringify(allGaps));
    for (const gap of allGaps) {
      if (needToFillGaps) {
        gap.fillGap({
          gte: start,
          lte: end,
        });
      }

      updateGapStatus({
        gap,
        savedObjectsClient,
        ruleId,
      });

      console.log(gap);

      const esGap = gap.getEsObject();
      const meta = gap.meta;

      if (meta) {
        try {
          await alertingEventLogger.updateGap({
            meta,
            gap: esGap,
          });
        } catch (e) {
          // TODO version mismatch -> 
          // refetch gap
          // check status
          // retry

          logger.error('failed update');
        }
      }
    }
  } catch (err) {
    logger.error(`Failed to process gaps for rule ${ruleId}: ${err.message}`);
    throw err;
  }
}
