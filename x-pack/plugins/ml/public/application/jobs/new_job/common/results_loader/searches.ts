/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import { ML_RESULTS_INDEX_PATTERN } from '../../../../../../common/constants/index_patterns';
import { escapeForElasticsearchQuery } from '../../../../util/string_utils';
import { ml } from '../../../../services/ml_api_service';

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
  jobId: string,
  earliestMs: number,
  latestMs: number,
  interval: string,
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

    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
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
                  interval,
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
    })
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
