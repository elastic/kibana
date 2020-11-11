/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessListAPIRequest, MetricsAPIRequest } from '../../../common/http_api';
import { getAllMetricsData } from '../../utils/get_all_metrics_data';
import { query } from '../metrics';
import { ESSearchClient } from '../metrics/types';

export const getProcessList = async (
  client: ESSearchClient,
  { hostTerm, timerange, indexPattern }: ProcessListAPIRequest
) => {
  const queryBody = {
    timerange,
    modules: ['system.cpu', 'system.memory'],
    groupBy: ['system.process.cmdline'],
    filters: [{ term: hostTerm }],
    indexPattern,
    limit: 9,
    metrics: [
      {
        id: 'cpu',
        aggregations: {
          cpu: {
            avg: {
              field: 'system.process.cpu.total.norm.pct',
            },
          },
        },
      },
      {
        id: 'memory',
        aggregations: {
          memory: {
            avg: {
              field: 'system.process.memory.rss.pct',
            },
          },
        },
      },
      {
        id: 'meta',
        aggregations: {
          meta: {
            top_hits: {
              size: 1,
              sort: [{ [timerange.field]: { order: 'desc' } }],
              _source: ['system.process.cpu.start_time', 'system.process.state'],
            },
          },
        },
      },
    ],
  } as MetricsAPIRequest;
  return await getAllMetricsData((body: MetricsAPIRequest) => query(client, body), queryBody);
};
