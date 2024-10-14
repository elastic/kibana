/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import { escapeForElasticsearchQuery } from '../../../../util/string_utils';
import type { MlApi } from '../../../../services/ml_api_service';

interface SplitFieldWithValue {
  name: string;
  value: string;
}

type TimeStamp = number;

interface Result {
  time: TimeStamp;
  value: unknown;
}

interface ProcessedResults {
  success: boolean;
  results: Record<number, Result[]>;
  totalResults: number;
}

// detector swimlane search
export function getScoresByRecord(
  mlApi: MlApi,
  jobId: string,
  earliestMs: number,
  latestMs: number,
  intervalMs: number,
  firstSplitField: SplitFieldWithValue | null
): Promise<ProcessedResults> {
  return new Promise((resolve, reject) => {
    const obj: ProcessedResults = {
      success: true,
      results: {},
      totalResults: 0,
    };

    let jobIdFilterStr = 'job_id: ' + jobId;
    if (firstSplitField && firstSplitField.value !== undefined) {
      // Escape any reserved characters for the query_string query,
      // wrapping the value in quotes to do a phrase match.
      // Backslash is a special character in JSON strings, so doubly escape
      // any backslash characters which exist in the field value.
      jobIdFilterStr += ` AND ${escapeForElasticsearchQuery(firstSplitField.name)}:`;
      jobIdFilterStr += `"${String(firstSplitField.value).replace(/\\/g, '\\\\')}"`;
    }

    mlApi.results
      .anomalySearch(
        {
          body: {
            size: 0,
            query: {
              bool: {
                filter: [
                  {
                    query_string: {
                      query: 'result_type:record',
                    },
                  },
                  {
                    bool: {
                      must: [
                        {
                          range: {
                            timestamp: {
                              gte: earliestMs,
                              lte: latestMs,
                              // @ts-ignore
                              format: 'epoch_millis',
                            },
                          },
                        },
                        {
                          query_string: {
                            query: jobIdFilterStr,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            aggs: {
              detector_index: {
                terms: {
                  field: 'detector_index',
                  order: {
                    recordScore: 'desc',
                  },
                },
                aggs: {
                  recordScore: {
                    max: {
                      field: 'record_score',
                    },
                  },
                  byTime: {
                    date_histogram: {
                      field: 'timestamp',
                      fixed_interval: `${intervalMs}ms`,
                      min_doc_count: 1,
                      extended_bounds: {
                        min: earliestMs,
                        max: latestMs,
                      },
                    },
                    aggs: {
                      recordScore: {
                        max: {
                          field: 'record_score',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        [jobId]
      )
      .then((resp: any) => {
        const detectorsByIndex = get(resp, ['aggregations', 'detector_index', 'buckets'], []);
        detectorsByIndex.forEach((dtr: any) => {
          const dtrResults: Result[] = [];
          const dtrIndex = +dtr.key;

          const buckets = get(dtr, ['byTime', 'buckets'], []);
          for (let j = 0; j < buckets.length; j++) {
            const bkt: any = buckets[j];
            const time = bkt.key;
            dtrResults.push({
              time,
              value: get(bkt, ['recordScore', 'value']),
            });
          }
          obj.results[dtrIndex] = dtrResults;
        });

        resolve(obj);
      })
      .catch((resp: any) => {
        reject(resp);
      });
  });
}
