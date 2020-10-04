/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment, { unitOfTime } from 'moment';

import { IKibanaSearchResponse } from '../../../../../../../src/plugins/data/common/search/types';
import { EqlSearchStrategyResponse } from '../../../../../data_enhanced/common';
import { EqlAggsResponse } from './api';

// Calculates which 5 min bucket segment, event should be
// sorted into
export const calculateBucketForHour = (eventTimestamp: number, relativeNow: number): number => {
  const diff: number = relativeNow - eventTimestamp;
  const minutes: number = Math.floor(diff / 60000);
  return Math.ceil(minutes / 5) * 5;
};

// Calculates which 1 hour bucket segment, event should be
// sorted into
export const calculateBucketForDay = (eventTimestamp: number, relativeNow: number): number => {
  const diff: number = relativeNow - eventTimestamp;
  const minutes: number = Math.floor(diff / 60000);
  return Math.ceil(minutes / 60);
};

// NOTE: Eql does not support aggregations, this is an in-memory
// hand-spun aggregation for the events to give the user a visual
// representation of their query results
export const getEqlAggsData = (
  response: EqlSearchStrategyResponse<IKibanaSearchResponse>,
  range: unitOfTime.DurationConstructor,
  to: string,
  from: string
): EqlAggsResponse => {
  const inspectDsl: string[] = [JSON.stringify(response.rawResponse.meta.request.params, null, 2)];
  const inspectResponse: string[] = [JSON.stringify(response.rawResponse.body, null, 2)];
  // The upper bound of the timestamps
  const relativeNow: number = Date.parse(from);
  const accumulator: Record<string, { timestamp: string; total: number }> = getInterval(
    range,
    from,
    relativeNow
  );

  if (response.rawResponse.body.hits != null && response.rawResponse.body.hits.events != null) {
    const buckets = response.rawResponse.body.hits.events.reduce<EqlAggsResponse>((acc, hit) => {
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
        dsl: inspectDsl,
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
      dsl: inspectDsl,
      response: inspectResponse,
    },
  };
};

export const getInterval = (
  range: unitOfTime.DurationConstructor,
  from: string,
  relativeNow: number
): Record<string, { timestamp: string; total: number }> => {
  switch (range) {
    case 'h':
      return [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].reduce((acc, int) => {
        return {
          ...acc,
          [int]: { timestamp: moment(relativeNow).subtract(int, 'm').format('x'), total: 0 },
        };
      }, {});
    case 'd':
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
        .map((i) => i)
        .reduce((acc, int) => {
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
): EqlAggsResponse => {
  const hits = response.rawResponse.body.hits ?? [];
  const data = hits.sequences.map((sequence, i) => {
    return sequence.events.map((seqEvent) => {
      return {
        x: seqEvent._source['@timestamp'],
        y: 1,
        g: `Event ${i}`,
      };
    });
  });

  return {
    data: data.flat(),
    totalCount: 5,
    lte: from,
    gte: to,
    inspect: {
      dsl: [JSON.stringify(response.rawResponse.meta.request.params)],
      response: [JSON.stringify(response.rawResponse.body, null, 2)],
    },
  };
};
