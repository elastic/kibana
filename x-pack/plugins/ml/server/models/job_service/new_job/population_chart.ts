/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { AggFieldNamePair, EVENT_RATE_FIELD_ID } from '../../../../common/types/fields';
import { ML_MEDIAN_PERCENTS } from '../../../../common/util/job_utils';

const OVER_FIELD_EXAMPLES_COUNT = 40;

type DtrIndex = number;
type TimeStamp = number;
type Value = number | undefined | null;
interface Thing {
  label: string;
  value: Value;
}
interface Result {
  time: TimeStamp;
  values: Thing[];
}

interface ProcessedResults {
  success: boolean;
  results: Record<number, Result[]>;
  totalResults: number;
}

export function newJobPopulationChartProvider({ callAsCurrentUser }: ILegacyScopedClusterClient) {
  async function newJobPopulationChart(
    indexPatternTitle: string,
    timeField: string,
    start: number,
    end: number,
    intervalMs: number,
    query: object,
    aggFieldNamePairs: AggFieldNamePair[],
    splitFieldName: string | null
  ) {
    const json: object = getPopulationSearchJsonFromConfig(
      indexPatternTitle,
      timeField,
      start,
      end,
      intervalMs,
      query,
      aggFieldNamePairs,
      splitFieldName
    );

    try {
      const results = await callAsCurrentUser('search', json);
      return processSearchResults(
        results,
        aggFieldNamePairs.map((af) => af.field)
      );
    } catch (error) {
      return { error };
    }
  }

  return {
    newJobPopulationChart,
  };
}

function processSearchResults(resp: any, fields: string[]): ProcessedResults {
  const aggregationsByTime = get(resp, ['aggregations', 'times', 'buckets'], []);

  const tempResults: Record<DtrIndex, Result[]> = {};
  fields.forEach((f, i) => (tempResults[i] = []));

  aggregationsByTime.forEach((dataForTime: any) => {
    const time: TimeStamp = +dataForTime.key;

    fields.forEach((field, i) => {
      const populationBuckets = get(dataForTime, ['population', 'buckets'], []);
      const values: Thing[] = [];
      if (field === EVENT_RATE_FIELD_ID) {
        populationBuckets.forEach((b: any) => {
          // check to see if the data is split.
          if (b[i] === undefined) {
            values.push({ label: b.key, value: b.doc_count });
          } else {
            // a split is being used, so an additional filter was added to the search
            values.push({ label: b.key, value: b[i].doc_count });
          }
        });
      } else if (typeof dataForTime.population !== 'undefined') {
        populationBuckets.forEach((b: any) => {
          const tempBucket = b[i];
          let value = null;
          // check to see if the data is split
          // if the field has been split, an additional filter and aggregation
          // has been added to the search in the form of splitValue
          const tempValue =
            tempBucket.value === undefined && tempBucket.splitValue !== undefined
              ? tempBucket.splitValue
              : tempBucket;

          // check to see if values is exists rather than value.
          // if values exists, the aggregation was median
          if (tempValue.value === undefined && tempValue.values !== undefined) {
            value = tempValue.values[ML_MEDIAN_PERCENTS];
          } else {
            value = tempValue.value;
          }
          values.push({ label: b.key, value: isFinite(value) ? value : null });
        });
      }

      tempResults[i].push({
        time,
        values,
      });
    });
  });

  return {
    success: true,
    results: tempResults,
    totalResults: resp.hits.total,
  };
}

function getPopulationSearchJsonFromConfig(
  indexPatternTitle: string,
  timeField: string,
  start: number,
  end: number,
  intervalMs: number,
  query: any,
  aggFieldNamePairs: AggFieldNamePair[],
  splitFieldName: string | null
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

  const aggs: any = {};

  aggFieldNamePairs.forEach(({ agg, field, by }, i) => {
    if (field === EVENT_RATE_FIELD_ID) {
      if (by !== undefined && by.field !== null && by.value !== null) {
        aggs[i] = {
          filter: {
            term: {
              [by.field]: by.value,
            },
          },
        };
      }
    } else {
      if (by !== undefined && by.field !== null && by.value !== null) {
        // if the field is split, add a filter to the aggregation to just select the
        // fields which match the first split value (the front chart
        aggs[i] = {
          filter: {
            term: {
              [by.field]: by.value,
            },
          },
          aggs: {
            splitValue: {
              [agg]: { field },
            },
          },
        };
        if (agg === 'percentiles') {
          aggs[i].aggs.splitValue[agg].percents = [ML_MEDIAN_PERCENTS];
        }
      } else {
        aggs[i] = {
          [agg]: { field },
        };

        if (agg === 'percentiles') {
          aggs[i][agg].percents = [ML_MEDIAN_PERCENTS];
        }
      }
    }
  });

  if (splitFieldName !== undefined) {
    // the over field should not be undefined. the user should not have got this far if it is.
    // add the wrapping terms based aggregation to divide the results up into
    // over field values.
    // we just want the first 40, or whatever OVER_FIELD_EXAMPLES_COUNT is set to.
    json.body.aggs.times.aggs = {
      population: {
        terms: {
          field: splitFieldName,
          size: OVER_FIELD_EXAMPLES_COUNT,
        },
        aggs,
      },
    };
  } else {
    json.body.aggs.times.aggs = aggs;
  }
  return json;
}
