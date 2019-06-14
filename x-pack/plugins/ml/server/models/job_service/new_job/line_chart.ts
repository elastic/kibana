/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { DslName } from '../../../../common/types/fields';
import { ML_MEDIAN_PERCENTS } from '../../../../common/util/job_utils';

export type callWithRequestType = (action: string, params: any) => Promise<any>;

type TimeStamp = number;
type Value = number | undefined | null;
interface Result {
  time: TimeStamp;
  value: Value;
}

interface ProcessedResults {
  success: boolean;
  results: Result[];
  totalResults: number;
}

export function newJobChartsProvider(callWithRequest: callWithRequestType) {
  async function newJobLineChart(
    indexPatternTitle: string,
    timeField: string,
    start: number,
    end: number,
    intervalMs: number,
    query: object,
    field: string | null,
    aggName: DslName
  ) {
    const json: object = getSearchJsonFromConfig(
      indexPatternTitle,
      timeField,
      start,
      end,
      intervalMs,
      query,
      field,
      aggName
    );

    const results = await callWithRequest('search', json);
    return processSearchResults(results, field);
  }
  return {
    newJobLineChart,
  };
}

function processSearchResults(resp: any, field: string | null): ProcessedResults {
  const aggregationsByTime = get(resp, ['aggregations', 'times', 'buckets'], []);
  let highestValue: number;
  let lowestValue: number;

  const results: Result[] = [];

  aggregationsByTime.forEach((dataForTime: any) => {
    const time: TimeStamp = +dataForTime.key;
    let value: Value = get(dataForTime, ['field_value', 'value']);

    if (value === undefined && field !== null) {
      value = get(dataForTime, ['field_value', 'values', ML_MEDIAN_PERCENTS]);
    }

    if (value === undefined && field === null) {
      value = dataForTime.doc_count;
    }
    if (
      (value !== null && value !== undefined && !isFinite(value)) ||
      dataForTime.doc_count === 0
    ) {
      value = null;
    }

    if (value !== null && value !== undefined) {
      highestValue = highestValue === undefined ? value : Math.max(value, highestValue);
      lowestValue = lowestValue === undefined ? value : Math.min(value, lowestValue);
    }

    results.push({
      time,
      value,
    });
  });

  return {
    success: true,
    results: results.sort((a, b) => a.time - b.time),
    totalResults: resp.hits.total,
  };
}

function getSearchJsonFromConfig(
  indexPatternTitle: string,
  timeField: string,
  start: number,
  end: number,
  intervalMs: number,
  query: any,
  field: string | null,
  aggName: DslName
): object {
  const json = {
    index: indexPatternTitle,
    size: 0,
    rest_total_hits_as_int: true,
    body: {
      query: {},
      aggs: {
        times: {
          date_histogram: {
            field: timeField,
            interval: intervalMs,
            min_doc_count: 0,
            extended_bounds: {
              min: start,
              max: end,
            },
          },
          aggs: {},
        },
      },
    },
  };

  query.bool.must.push({
    range: {
      [timeField]: {
        gte: start,
        lte: end,
        format: 'epoch_millis',
      },
    },
  });

  json.body.query = query;

  if (field !== null) {
    json.body.aggs.times.aggs = {
      field_value: {
        [aggName]: { field },
      },
    };
  }

  return json;
}
