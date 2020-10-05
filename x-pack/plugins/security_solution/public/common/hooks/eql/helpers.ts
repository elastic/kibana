/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { Unit } from '@elastic/datemath';

import { EqlSearchStrategyResponse } from '../../../../../data_enhanced/common';
import { InspectResponse } from '../../../types';
import { EqlPreviewResponse } from './api';

// Calculates which 5 min bucket segment, event should be
// sorted into
export const calculateBucketForHour = (eventTimestamp: number, relativeNow: number): number => {
  const diff: number = relativeNow - eventTimestamp;
  const minutes: number = Math.floor(diff / 60000);
  return Math.ceil(minutes / 2) * 2;
};

// Calculates which 1 hour bucket segment, event should be
// sorted into
export const calculateBucketForDay = (eventTimestamp: number, relativeNow: number): number => {
  const diff: number = relativeNow - eventTimestamp;
  const minutes: number = Math.floor(diff / 60000);
  return Math.ceil(minutes / 60);
};

export const formatInspect = (response): InspectResponse => {
  if (response != null) {
    return {
      dsl: [JSON.stringify(response.meta.request.params, null, 2)] ?? [],
      response: [JSON.stringify(response.body, null, 2)] ?? [],
    };
  }

  return {
    dsl: [],
    response: [],
  };
};

// NOTE: Eql does not support aggregations, this is an in-memory
// hand-spun aggregation for the events to give the user a visual
// representation of their query results
export const getEqlAggsData = (
  response: EqlSearchStrategyResponse<unknown>,
  range: Unit,
  to: string,
  from: string
): EqlPreviewResponse => {
  const { dsl, response: inspectResponse } = formatInspect(response.rawResponse);
  // The upper bound of the timestamps
  const relativeNow: number = Date.parse(from);
  const accumulator = getInterval(range, relativeNow);

  if (response.rawResponse.body.hits != null && response.rawResponse.body.hits.events != null) {
    const buckets = response.rawResponse.body.hits.events.reduce<EqlPreviewResponse>((acc, hit) => {
      const eventTimestamp: number = Date.parse(hit._source['@timestamp']);
      const bucket =
        range === 'h'
          ? calculateBucketForHour(eventTimestamp, relativeNow)
          : calculateBucketForDay(eventTimestamp, relativeNow);
      if (acc[bucket] != null) {
        acc[bucket].total += 1;
      }
      return acc;
    }, accumulator);

    const data = Object.keys(buckets).map((key) => {
      return { x: Number(buckets[key].timestamp), y: buckets[key].total, g: 'hits' };
    });

    return {
      data,
      totalCount: response.rawResponse.body.hits.total.value,
      lte: from,
      gte: to,
      inspect: {
        dsl,
        response: inspectResponse,
      },
    };
  }

  return {
    data: [],
    totalCount: 0,
    lte: from,
    gte: to,
    inspect: {
      dsl,
      response: inspectResponse,
    },
  };
};

export const createIntervalArray = (start: number, end: number, multiplier: number) => {
  return Array(end - start + 1)
    .fill(0)
    .map((_, idx) => start + idx * multiplier);
};

export const getInterval = (
  range: Unit,
  relativeNow: number
): Record<string, { timestamp: string; total: number }> => {
  switch (range) {
    case 'h':
      return createIntervalArray(0, 30, 2).reduce((acc, int) => {
        return {
          ...acc,
          [int]: { timestamp: moment(relativeNow).subtract(int, 'm').format('x'), total: 0 },
        };
      }, {});
    case 'd':
      return createIntervalArray(0, 24, 1).reduce((acc, int) => {
        return {
          ...acc,
          [int]: { timestamp: moment(relativeNow).subtract(int, 'h').format('x'), total: 0 },
        };
      }, {});
    default:
      throw new Error('Invalid time range selected');
  }
};

export const getSequenceAggs = (
  response: EqlSearchStrategyResponse,
  to: string,
  from: string
): EqlPreviewResponse => {
  const { dsl, response: inspectResponse } = formatInspect(response.rawResponse);
  const hits = response.rawResponse.body.hits ?? [];
  const data = hits.sequences.map((sequence, i) => {
    return sequence.events.map((seqEvent) => {
      return {
        x: seqEvent._source['@timestamp'],
        y: 1,
        g: `Seq. ${i + 1}`,
      };
    });
  });

  return {
    data: data.flat(),
    totalCount: response.rawResponse.body.hits.total.value,
    lte: from,
    gte: to,
    inspect: {
      dsl,
      response: inspectResponse,
    },
  };
};
