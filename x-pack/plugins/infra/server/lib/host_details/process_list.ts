/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessListAPIRequest, ProcessListAPIQueryAggregation } from '../../../common/http_api';
import { ESSearchClient } from '../metrics/types';
import { CMDLINE_FIELD } from './common';

const TOP_N = 10;

export const getProcessList = async (
  search: ESSearchClient,
  { hostTerm, timefield, indexPattern, to, sortBy, searchFilter }: ProcessListAPIRequest
) => {
  const body = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              [timefield]: {
                gte: to - 60 * 1000, // 1 minute
                lte: to,
              },
            },
          },
          {
            term: hostTerm,
          },
        ],
      },
    },
    aggs: {
      summaryEvent: {
        filter: {
          term: {
            'event.dataset': 'system.process.summary',
          },
        },
        aggs: {
          summary: {
            top_hits: {
              size: 1,
              sort: [
                {
                  [timefield]: {
                    order: 'desc',
                  },
                },
              ],
              _source: ['system.process.summary'],
            },
          },
        },
      },
      processes: {
        filter: {
          bool: {
            must: searchFilter ?? [{ match_all: {} }],
          },
        },
        aggs: {
          filteredProcs: {
            terms: {
              field: CMDLINE_FIELD,
              size: TOP_N,
              order: {
                [sortBy.name]: sortBy.isAscending ? 'asc' : 'desc',
              },
            },
            aggs: {
              cpu: {
                avg: {
                  field: 'system.process.cpu.total.pct',
                },
              },
              memory: {
                avg: {
                  field: 'system.process.memory.rss.pct',
                },
              },
              startTime: {
                max: {
                  field: 'system.process.cpu.start_time',
                },
              },
              meta: {
                top_hits: {
                  size: 1,
                  sort: [
                    {
                      [timefield]: {
                        order: 'desc',
                      },
                    },
                  ],
                  _source: ['system.process.state', 'user.name', 'process.pid'],
                },
              },
            },
          },
        },
      },
    },
  };
  try {
    const result = await search<{}, ProcessListAPIQueryAggregation>({
      body,
      index: indexPattern,
    });
    const { buckets: processListBuckets } = result.aggregations!.processes.filteredProcs;
    const processList = processListBuckets.map((bucket) => {
      const meta = bucket.meta.hits.hits[0]._source;

      return {
        cpu: bucket.cpu.value,
        memory: bucket.memory.value,
        startTime: Date.parse(bucket.startTime.value_as_string),
        pid: meta.process.pid,
        state: meta.system.process.state,
        user: meta.user.name,
        command: bucket.key,
      };
    });

    let summary: { [p: string]: number } = {};
    if (result.aggregations!.summaryEvent.summary.hits.hits.length) {
      summary = result.aggregations!.summaryEvent.summary.hits.hits[0]._source.system.process
        .summary;
    }

    return {
      processList,
      summary,
    };
  } catch (e) {
    throw e;
  }
};
