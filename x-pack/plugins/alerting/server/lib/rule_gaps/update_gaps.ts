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
import { Gap } from './types';
import { AdHocRunSO } from '../../data/ad_hoc_run/types';
import { parseDuration } from '../../../common';
import { transformAdHocRunToBackfillResult } from '../../application/backfill/transforms';

interface Interval {
  lte: string;
  gte: string;
}

const overlapIntervals = (interval1: Interval, interval2: Interval): Interval | null => {
  const start1 = new Date(interval1.gte).getTime();
  const end1 = new Date(interval1.lte).getTime();
  const start2 = new Date(interval2.gte).getTime();
  const end2 = new Date(interval2.lte).getTime();
  const maxStart = Math.max(start1, start2);
  const minEnd = Math.min(end1, end2);
  if (maxStart < minEnd) {
    return {
      gte: new Date(maxStart).toISOString(),
      lte: new Date(minEnd).toISOString(),
    };
  } else {
    return null;
  }
};

/**
 * Merges overlapping intervals in a list.
 */
const mergeIntervals = (intervals: Interval[]): Interval[] => {
  if (!intervals.length) return [];
  intervals.sort((a, b) => new Date(a.gte).getTime() - new Date(b.gte).getTime());
  const merged: Interval[] = [intervals[0]];
  for (const current of intervals.slice(1)) {
    const last = merged[merged.length - 1];
    if (new Date(last.lte) >= new Date(current.gte)) {
      last.lte = new Date(
        Math.max(new Date(last.lte).getTime(), new Date(current.lte).getTime())
      ).toISOString();
    } else {
      merged.push(current);
    }
  }
  return merged;
};

/**
 * Subtracts a list of intervals from a base interval.
 */
const subtractIntervals = (interval: Interval, intervalsToSubtract: Interval[]): Interval[] => {
  let intervals: Interval[] = [interval];
  for (const subtractInterval of intervalsToSubtract) {
    intervals = intervals.flatMap((current) => {
      const overlap = overlapIntervals(current, subtractInterval);
      if (!overlap) return [current];
      const results: Interval[] = [];
      if (new Date(current.gte) < new Date(overlap.gte)) {
        results.push({ gte: current.gte, lte: overlap.gte });
      }
      if (new Date(current.lte) > new Date(overlap.lte)) {
        results.push({ gte: overlap.lte, lte: current.lte });
      }
      return results;
    });
  }
  return intervals;
};

/**
 * Subtracts a list of intervals from another list of intervals.
 */
const subtractIntervalsFromIntervals = (
  intervals: Interval[],
  intervalsToSubtract: Interval[]
): Interval[] => {
  const result: Interval[] = [];
  for (const interval of intervals) {
    const subtracted = subtractIntervals(interval, intervalsToSubtract);
    result.push(...subtracted);
  }
  return mergeIntervals(result);
};

/**
 * Fill the gap with the interval
 */
const fillGap = (gap: Gap, interval: { from: Date; to: Date }): Gap => {
  const newGap = {
    ...gap,
  };
  newGap.status = 'filled'; // ..
  newGap.filledIntervals = []; // ...
  newGap.inProgressIntervals = []; // ...
  newGap.unfilledIntervals = []; // ...

  return newGap;
};

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
    ad_hoc_run_params.attributes.start <= "${gap.range.lte}" and 
    ad_hoc_run_params.attributes.end >= "${gap.range.gte}"
  `,
    page: 1,
    perPage: 100,
  });

  // TODO: Extract backfill transform to another function, to reuse in API
  const transformedBackfills = backfillSOs.map((data) => transformAdHocRunToBackfillResult(data));

  console.log('backfillResults', JSON.stringify(backfillSOs, null, 2));
  console.log('transformedBackfills', JSON.stringify(transformedBackfills, null, 2));

  const potenialInProgressIntervals = [];

  // Process each backfill's schedule
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
      // Check overlap with gap.range
      const overlap = overlapIntervals(scheduleInterval, gap.range);
      if (overlap) {
        potenialInProgressIntervals.push(overlap);
      }
    }
  }

  // Merge overlapping intervals in potentialInProgress
  const mergedPotentialInProgress = mergeIntervals(potenialInProgressIntervals);

  const inProgressIntervals = subtractIntervalsFromIntervals(
    mergedPotentialInProgress,
    gap.filledIntervals
  );

  // unfilledIntervals = gap.range excluding filledIntervals and inProgressIntervals
  const unfilledIntervals = subtractIntervals(
    gap.range,
    mergeIntervals([...gap.filledIntervals, ...inProgressIntervals])
  );

  const newGap = { ...gap, inProgressIntervals, unfilledIntervals };

  console.log('newGap', JSON.stringify(newGap));

  const hasPendingOverlapingTasks = true; // backfillResults.......;

  if (hasPendingOverlapingTasks && newGap.status !== 'filled') {
    newGap.status = 'filled';
    newGap.inProgressIntervals = []; // ..[]
  }

  return newGap;
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
      },
    });

    console.log('allGaps', JSON.stringify(allGaps, null, 2));

    for (const gap of allGaps) {
      const newGap = needToFillGaps
        ? fillGap(gap, {
            from: start,
            to: end,
          })
        : gap;

      const updatedGap = await updateGapStatus({
        gap: newGap,
        savedObjectsClient,
        ruleId,
      });

      const { _id, ...gapBody } = updatedGap;
      console.log('updatedGap', JSON.stringify(updatedGap));

      await alertingEventLogger.updateGap({
        _id,
        gap: { ...gapBody, unfilled_intervals: gapBody.unfilledIntervals },
      });
    }
  } catch (err) {
    logger.error(`Failed to process gaps for rule ${ruleId}: ${err.message}`);
    throw err;
  }
}
