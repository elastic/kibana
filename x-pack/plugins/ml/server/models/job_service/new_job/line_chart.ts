/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { DslName, AggFieldNamePair } from '../../../../common/types/fields';
import { ML_MEDIAN_PERCENTS } from '../../../../common/util/job_utils';

export type callWithRequestType = (action: string, params: any) => Promise<any>;

const EVENT_RATE_COUNT_FIELD = '__ml_event_rate_count__';

type TimeStamp = number;
type Value = number | undefined | null;
interface Result {
  time: TimeStamp;
  value: Value;
}

interface ProcessedResults {
  success: boolean;
  results: Record<number, Result[]>;
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
    aggFieldNamePairs: AggFieldNamePair[],
    agg: DslName
  ) {
    const json: object = getSearchJsonFromConfig(
      indexPatternTitle,
      timeField,
      start,
      end,
      intervalMs,
      query,
      aggFieldNamePairs
    );

    const results = await callWithRequest('search', json);
    return processSearchResults(results, aggFieldNamePairs.map(af => af.field));
  }
  return {
    newJobLineChart,
  };
}

function processSearchResults(resp: any, fields: string[]): ProcessedResults {
  const aggregationsByTime = get(resp, ['aggregations', 'times', 'buckets'], []);
  // let highestValue: number;
  // let lowestValue: number;

  const tempResults: Record<number, Result[]> = {};
  fields.forEach((f, i) => (tempResults[i] = []));

  aggregationsByTime.forEach((dataForTime: any) => {
    const time: TimeStamp = +dataForTime.key;
    const docCount = +dataForTime.doc_count;

    fields.forEach((field, i) => {
      let value;
      if (fields[i] === EVENT_RATE_COUNT_FIELD) {
        value = docCount;
      } else if (typeof dataForTime[i].value !== 'undefined') {
        value = dataForTime[i].value;
      } else if (typeof dataForTime[i].values !== 'undefined') {
        value = dataForTime[i].values[ML_MEDIAN_PERCENTS];
      }

      // let value: Value = get(dataForTime, ['field_value', 'value']);

      // if (value === undefined && field !== null) {
      //   value = get(dataForTime, ['field_value', 'values', ML_MEDIAN_PERCENTS]);
      // }

      // if (value === undefined && field === null) {
      //   value = dataForTime.doc_count;
      // }
      // if (
      //   (value !== null && value !== undefined && !isFinite(value)) ||
      //   dataForTime.doc_count === 0
      // ) {
      //   value = null;
      // }

      // if (value !== null && value !== undefined) {
      //   highestValue = highestValue === undefined ? value : Math.max(value, highestValue);
      //   lowestValue = lowestValue === undefined ? value : Math.min(value, lowestValue);
      // }

      tempResults[i].push({
        time,
        value,
      });
    });
  });

  // const results: Record<number, Result[]> = {};
  // Object.entries(tempResults).forEach(([fieldIdx, results2]) => {
  //   results[+fieldIdx] = results2.sort((a, b) => a.time - b.time);
  // });

  return {
    success: true,
    results: tempResults,
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
  aggFieldNamePairs: AggFieldNamePair[]
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

  const aggs: Record<number, Record<string, { field: string; percents?: number[] }>> = {};

  aggFieldNamePairs.forEach(({ agg, field }, i) => {
    if (field !== null) {
      aggs[i] = {
        [agg]: { field },
      };

      if (agg === 'percentiles') {
        aggs[i][agg].percents = [ML_MEDIAN_PERCENTS];
      }
    }
  });

  json.body.aggs.times.aggs = aggs;
  // json.body.aggs.times.aggs = {
  //   field_value: {
  //     [agg]: { field },
  //   },
  // };

  // if (Object.keys(formConfig.fields).length) {
  //   json.body.aggs.times.aggs = {};
  //   _.each(formConfig.fields, field => {
  //     if (field.id !== EVENT_RATE_COUNT_FIELD) {
  //       json.body.aggs.times.aggs[field.id] = {
  //         [field.agg.type.dslName]: { field: field.name },
  //       };

  //       if (field.agg.type.dslName === 'percentiles') {
  //         json.body.aggs.times.aggs[field.id][field.agg.type.dslName].percents = [
  //           ML_MEDIAN_PERCENTS,
  //         ];
  //       }
  //     }
  //   });
  // }

  return json;
}
