/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { Unit } from '@elastic/datemath';

import * as i18n from '../../../detections/components/rules/query_preview/translations';
import { EqlSearchStrategyResponse } from '../../../../../data_enhanced/common';
import { InspectResponse } from '../../../types';
import { EqlPreviewResponse, Source } from './types';
import { EqlSearchResponse } from '../../../../common/detection_engine/types';
import { HITS_THRESHOLD } from '../../../detections/components/rules/query_preview/helpers';

type EqlAggBuckets = Record<string, { timestamp: string; total: number }>;

export const EQL_QUERY_EVENT_SIZE = 100;

// Calculates which 2 min bucket segment, event should be
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

export const constructWarnings = (timestampIssue: boolean, hits: number, range: Unit): string[] => {
  let warnings: string[] = [];

  if (timestampIssue) {
    warnings = [i18n.PREVIEW_WARNING_TIMESTAMP];
  }

  if (hits === EQL_QUERY_EVENT_SIZE) {
    warnings = [...warnings, i18n.PREVIEW_WARNING_CAP_HIT(EQL_QUERY_EVENT_SIZE)];
  }

  if (hits > HITS_THRESHOLD[range]) {
    warnings = [...warnings, i18n.QUERY_PREVIEW_NOISE_WARNING];
  }

  return warnings;
};

export const formatInspect = (
  response: EqlSearchStrategyResponse<EqlSearchResponse<Source>>
): InspectResponse => {
  if (response != null) {
    return {
      dsl: [JSON.stringify(response.rawResponse.meta.request.params, null, 2)] ?? [],
      response: [JSON.stringify(response.rawResponse.body, null, 2)] ?? [],
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
  response: EqlSearchStrategyResponse<EqlSearchResponse<Source>>,
  range: Unit,
  to: string,
  from: string
): EqlPreviewResponse => {
  const { dsl, response: inspectResponse } = formatInspect(response);
  // The upper bound of the timestamps
  const relativeNow: number = Date.parse(from);
  const accumulator: EqlAggBuckets = getInterval(range, relativeNow);
  const events = response.rawResponse.body.hits.events ?? [];
  const totalCount = response.rawResponse.body.hits.total.value;
  let timestampNotFound = false;

  const buckets = events.reduce<EqlAggBuckets>((acc, hit) => {
    const timestamp = hit._source['@timestamp'];
    if (timestamp == null) {
      timestampNotFound = true;
      return acc;
    }

    const eventTimestamp: number = Date.parse(timestamp);
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

  const warnings = constructWarnings(timestampNotFound, totalCount, range);

  return {
    data,
    totalCount: isAllZeros ? 0 : totalCount,
    lte: from,
    gte: to,
    inspect: {
      dsl,
      response: inspectResponse,
    },
    warnings,
  };
};

export const createIntervalArray = (start: number, end: number, multiplier: number) => {
  return Array(end - start + 1)
    .fill(0)
    .map((_, idx) => start + idx * multiplier);
};

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
      throw new Error('Invalid time range selected');
  }
};

export const getSequenceAggs = (
  response: EqlSearchStrategyResponse<EqlSearchResponse<Source>>,
  range: Unit,
  to: string,
  from: string
): EqlPreviewResponse => {
  const { dsl, response: inspectResponse } = formatInspect(response);
  const sequences = response.rawResponse.body.hits.sequences ?? [];
  const totalCount = response.rawResponse.body.hits.total.value;
  let timestampNotFound = false;

  const data = sequences.map((sequence, i) => {
    return sequence.events.map((seqEvent) => {
      if (seqEvent._source['@timestamp'] == null) {
        timestampNotFound = true;
        return {};
      }
      return {
        x: seqEvent._source['@timestamp'],
        y: 1,
        g: `Seq. ${i + 1}`,
      };
    });
  });

  const warnings = constructWarnings(timestampNotFound, totalCount, range);

  return {
    data: data.flat(),
    totalCount,
    lte: from,
    gte: to,
    inspect: {
      dsl,
      response: inspectResponse,
    },
    warnings,
  };
};
