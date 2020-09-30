/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment, { Moment, unitOfTime } from 'moment';

import { IKibanaSearchResponse } from '../../../../../../../src/plugins/data/common/search/types';
import { EqlSearchStrategyResponse } from '../../../../../data_enhanced/common';
import { EqlAggsResponse } from './api';

// For the time being, EQL does not support aggs
// this is a temporary workaround :/
export const getTimeBuckets = (
  from: Moment,
  to: Moment,
  buckets: string[],
  duration: number,
  interval: unitOfTime.DurationConstructor
): string[] => {
  if (Number(to.format('x')) >= Number(from.format('x'))) {
    return buckets;
  }

  const newStart = to.add(duration, interval);

  return getTimeBuckets(from, newStart, [...buckets, newStart.format()], duration, interval);
};

// For the time being, EQL does not support aggs
// this is a temporary workaround :/
export const getBucketRanges = (
  from: Moment,
  to: Moment,
  arr: string[],
  duration: number,
  interval: unitOfTime.DurationConstructor
) => {
  const buckets = getTimeBuckets(from, to, arr, duration, interval);

  return buckets.reduce<Array<{ lte: string; gte: string }>>((acc, bucket, index) => {
    if (index !== 0) {
      const before = buckets[index - 1];
      return [
        ...acc,
        {
          gte: `${before}`,
          lte: `${bucket}`,
        },
      ];
    }

    return acc;
  }, []);
};

export const getEqlAggsData = (
  inspectResponse: EqlSearchStrategyResponse<unknown>,
  responses: Array<EqlSearchStrategyResponse<IKibanaSearchResponse>>,
  to: string,
  from: string,
  ranges: Array<{ lte: string; gte: string }>
): EqlAggsResponse => {
  const dsl = [JSON.stringify(inspectResponse.rawResponse.meta.request.params)];
  const r = [JSON.stringify(inspectResponse.rawResponse.body, null, 2)];

  return responses.reduce<EqlAggsResponse>(
    (acc, res, index) => {
      if (res.status === 'fulfilled' && res.value.rawResponse.body.hits.total != null) {
        const hits = res.value.rawResponse.body.hits.total.value;
        return {
          ...acc,
          total: acc.total + hits,
          data: [
            ...acc.data,
            { x: Number(moment(ranges[index].lte).format('x')), y: hits, g: 'hits' },
          ],
        };
      } else {
        return {
          ...acc,
          data: [
            ...acc.data,
            { x: Number(moment(ranges[index].lte).format('x')), y: 0, g: 'hits' },
          ],
        };
      }
    },
    {
      data: [],
      total: 0,
      lte: from,
      gte: to,
      inspect: {
        dsl,
        response: r,
      },
    }
  );
};

export const getInterval = (range: string) => {
  switch (range) {
    case 'h':
      return { amount: 10, intervalType: 'm' };
    case 'd':
      return { amount: 3, intervalType: 'h' };
    default:
      throw new Error('Invalid time range selected');
  }
};
