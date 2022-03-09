/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { IScopedClusterClient } from 'kibana/server';
import {
  AggFieldNamePair,
  EVENT_RATE_FIELD_ID,
  RuntimeMappings,
} from '../../../../common/types/fields';
import { IndicesOptions } from '../../../../common/types/anomaly_detection_jobs';
import { ML_MEDIAN_PERCENTS } from '../../../../common/util/job_utils';

type DtrIndex = number;
type TimeStamp = number;
type Value = number | undefined | null;
interface Result {
  time: TimeStamp;
  value: Value;
}

export interface ProcessedResults {
  success: boolean;
  results: Record<number, Result[]>;
  totalResults: number;
}

export function newJobLineChartProvider({ asCurrentUser }: IScopedClusterClient) {
  async function newJobLineChart(
    indexPatternTitle: string,
    timeField: string,
    start: number,
    end: number,
    intervalMs: number,
    query: object,
    aggFieldNamePairs: AggFieldNamePair[],
    splitFieldName: string | null,
    splitFieldValue: string | null,
    runtimeMappings: RuntimeMappings | undefined,
    indicesOptions: IndicesOptions | undefined
  ) {
    const json: object = getSearchJsonFromConfig(
      indexPatternTitle,
      timeField,
      start,
      end,
      intervalMs,
      query,
      aggFieldNamePairs,
      splitFieldName,
      splitFieldValue,
      runtimeMappings,
      indicesOptions
    );

    const body = await asCurrentUser.search(json);
    return processSearchResults(
      body,
      aggFieldNamePairs.map((af) => af.field)
    );
  }

  return {
    newJobLineChart,
  };
}

function processSearchResults(resp: any, fields: string[]): ProcessedResults {
  const aggregationsByTime = get(resp, ['aggregations', 'times', 'buckets'], []);

  const tempResults: Record<DtrIndex, Result[]> = {};
  fields.forEach((f, i) => (tempResults[i] = []));

  aggregationsByTime.forEach((dataForTime: any) => {
    const time: TimeStamp = +dataForTime.key;
    const docCount = +dataForTime.doc_count;

    fields.forEach((field, i) => {
      let value;
      if (field === EVENT_RATE_FIELD_ID) {
        value = docCount;
      } else if (typeof dataForTime[i].value !== 'undefined') {
        value = dataForTime[i].value;
      } else if (typeof dataForTime[i].values !== 'undefined') {
        value = dataForTime[i].values[ML_MEDIAN_PERCENTS];
      }

      tempResults[i].push({
        time,
        value,
      });
    });
  });

  return {
    success: true,
    results: tempResults,
    totalResults: resp.hits.total.value,
  };
}

function getSearchJsonFromConfig(
  indexPatternTitle: string,
  timeField: string,
  start: number,
  end: number,
  intervalMs: number,
  query: any,
  aggFieldNamePairs: AggFieldNamePair[],
  splitFieldName: string | null,
  splitFieldValue: string | null,
  runtimeMappings: RuntimeMappings | undefined,
  indicesOptions: IndicesOptions | undefined
): object {
  const json = {
    index: indexPatternTitle,
    size: 0,
    track_total_hits: true,
    body: {
      query: {},
      aggs: {
        times: {
          date_histogram: {
            field: timeField,
            fixed_interval: `${intervalMs}ms`,
            min_doc_count: 0,
            extended_bounds: {
              min: start,
              max: end,
            },
          },
          aggs: {},
        },
      },
      ...(runtimeMappings !== undefined ? { runtime_mappings: runtimeMappings } : {}),
    },
    ...(indicesOptions ?? {}),
  };

  if (query.bool === undefined) {
    query.bool = {
      must: [],
    };
  } else if (query.bool.must === undefined) {
    query.bool.must = [];
  }

  query.bool.must.push({
    range: {
      [timeField]: {
        gte: start,
        lte: end,
        format: 'epoch_millis',
      },
    },
  });

  if (splitFieldName !== null && splitFieldValue !== null) {
    query.bool.must.push({
      term: {
        [splitFieldName]: splitFieldValue,
      },
    });
  }

  json.body.query = query;

  const aggs: Record<number, Record<string, { field: string; percents?: string[] }>> = {};

  aggFieldNamePairs.forEach(({ agg, field }, i) => {
    if (field !== null && field !== EVENT_RATE_FIELD_ID) {
      aggs[i] = {
        [agg]: { field },
      };

      if (agg === 'percentiles') {
        aggs[i][agg].percents = [ML_MEDIAN_PERCENTS];
      }
    }
  });

  json.body.aggs.times.aggs = aggs;

  return json;
}
