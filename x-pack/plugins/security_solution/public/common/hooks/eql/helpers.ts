/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Unit } from '@kbn/datemath';
import { inputsModel } from '../../../common/store';

import type { EqlSearchStrategyResponse } from '../../../../../../../src/plugins/data/common';
import { InspectResponse } from '../../../types';
import { EqlPreviewResponse, Source } from './types';
import { BaseHit, EqlSearchResponse } from '../../../../common/detection_engine/types';

type EqlAggBuckets = Record<string, { timestamp: string; total: number }>;

export const EQL_QUERY_EVENT_SIZE = 100;

/**
 * Calculates which 2 min bucket segment, event should be sorted into
 * @param eventTimestamp The event to be bucketed timestamp
 * @param relativeNow The timestamp we are using to calculate how far from 'now' event occurred
 */
export const calculateBucketForHour = (eventTimestamp: number, relativeNow: number): number => {
  const diff = Math.abs(relativeNow - eventTimestamp);
  const minutes = Math.floor(diff / 60000);
  return Math.ceil(minutes / 2) * 2;
};

/**
 * Calculates which 1 hour bucket segment, event should be sorted into
 * @param eventTimestamp The event to be bucketed timestamp
 * @param relativeNow The timestamp we are using to calculate how far from 'now' event occurred
 */
export const calculateBucketForDay = (eventTimestamp: number, relativeNow: number): number => {
  const diff = Math.abs(relativeNow - eventTimestamp);
  const minutes = Math.floor(diff / 60000);
  return Math.ceil(minutes / 60);
};

/**
 * Formats the response for the UI inspect modal
 * @param response The query search response
 * @param indices The indices the query searched
 * TODO: Update eql search strategy to return index in it's meta
 * params info, currently not being returned, but expected for
 * inspect modal display
 */
export const formatInspect = (
  response: EqlSearchStrategyResponse<EqlSearchResponse<Source>>,
  indices: string[]
): InspectResponse => {
  const body = response.rawResponse.meta.request.params.body;
  const bodyParse: Record<string, unknown> | undefined =
    typeof body === 'string' ? JSON.parse(body) : body;
  return {
    dsl: [
      JSON.stringify(
        { ...response.rawResponse.meta.request.params, index: indices, body: bodyParse },
        null,
        2
      ),
    ],
    response: [JSON.stringify(response.rawResponse.body, null, 2)],
  };
};

/**
 * Gets the events out of the response based on type of query
 * @param isSequence Is the eql query a sequence query
 * @param response The query search response
 */
export const getEventsToBucket = (
  isSequence: boolean,
  response: EqlSearchStrategyResponse<EqlSearchResponse<Source>>
): Array<BaseHit<Source>> => {
  const hits = response.rawResponse.body.hits ?? [];
  if (isSequence) {
    return (
      hits.sequences?.map((seq) => {
        return seq.events[seq.events.length - 1];
      }) ?? []
    );
  } else {
    return hits.events ?? [];
  }
};

/**
 * Eql does not support aggregations, this is an in-memory
 * hand-spun aggregation for the events to give the user a visual
 * representation of their query results
 * @param response The query search response
 * @param range User chosen timeframe (last hour, day)
 * @param to Based on range chosen
 * @param refetch Callback used in inspect button, ref just passed through
 * @param indices Indices searched by query
 * @param isSequence Is the eql query a sequence query
 */
export const getEqlAggsData = (
  response: EqlSearchStrategyResponse<EqlSearchResponse<Source>>,
  range: Unit,
  to: string,
  refetch: inputsModel.Refetch,
  indices: string[],
  isSequence: boolean
): EqlPreviewResponse => {
  const { dsl, response: inspectResponse } = formatInspect(response, indices);
  const relativeNow = Date.parse(to);
  const accumulator = getInterval(range, relativeNow);
  const events = getEventsToBucket(isSequence, response);
  const totalCount = response.rawResponse.body.hits.total.value;

  const buckets = events.reduce<EqlAggBuckets>((acc, hit) => {
    const timestamp = hit._source['@timestamp'];
    if (timestamp == null) {
      return acc;
    }
    const eventDate = new Date(timestamp).toISOString();
    const eventTimestamp = Date.parse(eventDate);
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

  const isAllZeros = data.every(({ y }) => y === 0);

  return {
    data,
    totalCount: isAllZeros ? 0 : totalCount,
    inspect: {
      dsl,
      response: inspectResponse,
    },
    refetch,
  };
};

/**
 * Helper method to create an array to be used for calculating bucket intervals
 * @param start
 * @param end
 * @param multiplier
 */
export const createIntervalArray = (start: number, end: number, multiplier: number): number[] => {
  return Array(end - start + 1)
    .fill(0)
    .map((_, idx) => start + idx * multiplier);
};

/**
 * Helper method to create an array to be used for calculating bucket intervals
 * @param range User chosen timeframe (last hour, day)
 * @param relativeNow Based on range chosen
 */
export const getInterval = (range: Unit, relativeNow: number): EqlAggBuckets => {
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
      throw new RangeError('Invalid time range selected. Must be "Last hour" or "Last day".');
  }
};
