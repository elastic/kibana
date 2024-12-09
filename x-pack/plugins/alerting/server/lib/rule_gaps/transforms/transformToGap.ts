/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import { Gap } from '../gap';
import { StringInterval } from '../types';

type PotenialInterval = { lte?: string; gte?: string } | undefined;
const validateInterval = (interval: PotenialInterval): StringInterval | null => {
  if (!interval?.gte || !interval?.lte) return null;

  return {
    lte: interval.lte,
    gte: interval.gte,
  };
};

const validateIntervals = (intervals: PotenialInterval[] | undefined): StringInterval[] =>
  (intervals?.map(validateInterval)?.filter((interval) => interval !== null) as StringInterval[]) ??
  [];

export const transformToGap = (events: QueryEventsBySavedObjectResult): Gap[] => {
  return events?.data
    ?.map((doc) => {
      const gap = doc?.kibana?.alert?.rule?.gap;
      if (!gap) return null;

      const range = validateInterval(gap.range);

      if (!range) return null;

      const filledIntervals = validateIntervals(gap?.filled_intervals);
      const inProgressIntervals = validateIntervals(gap?.in_progress_intervals);

      return new Gap({
        range,
        filledIntervals,
        inProgressIntervals,
        meta: {
          _id: doc._id,
          _index: doc._index,
          _seq_no: doc._seq_no,
          _primary_term: doc._primary_term,
        },
      });
    })
    .filter((gap): gap is Gap => gap !== null);
};
