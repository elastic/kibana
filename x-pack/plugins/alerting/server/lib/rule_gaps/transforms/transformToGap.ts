/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import { Gap } from '../types';

export const transformToGap = (events: QueryEventsBySavedObjectResult): Gap[] => {
  return events?.data
    ?.map((doc) => {
      const gap = doc?.kibana?.alert?.rule?.gap;
      if (!gap) return null;
      return {
        // eventId: doc.event.id,
        status: gap.status,
        range: gap.range,
        inProgressIntervals: gap.in_progress_intervals ?? [],
        filledIntervals: gap.filled_intervals ?? [],
        unfilledIntervals: gap.unfilled_intervals ?? [],
        totalGapDurationMs: Number(gap.total_gap_duration_ms),
        filledDurationMs: Number(gap.filled_duration_ms),
        unfilledDurationMs: Number(gap.unfilled_duration_ms),
        inProgressDurationMs: Number(gap.in_progress_duration_ms),
        _id: doc._id,
      };
    })
    .filter((gap): gap is Gap => gap !== null);
};
