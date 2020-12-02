/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { createApmQuery } from './create_apm_query';
// @ts-ignore
import { ApmClusterMetric } from '../metrics';
import { LegacyRequest, ElasticsearchResponse } from '../../types';

export async function getTimeOfLastEvent({
  req,
  callWithRequest,
  apmIndexPattern,
  start,
  end,
  clusterUuid,
}: {
  req: LegacyRequest;
  callWithRequest: (_req: any, endpoint: string, params: any) => Promise<ElasticsearchResponse>;
  apmIndexPattern: string;
  start: number;
  end: number;
  clusterUuid: string;
}) {
  const params = {
    index: apmIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    body: {
      _source: ['timestamp'],
      sort: [
        {
          timestamp: {
            order: 'desc',
            unmapped_type: 'long',
          },
        },
      ],
      query: createApmQuery({
        start,
        end,
        clusterUuid,
        metric: ApmClusterMetric.getMetricFields(),
        filters: [
          {
            range: {
              'beats_stats.metrics.libbeat.output.events.acked': {
                gt: 0,
              },
            },
          },
        ],
      }),
    },
  };

  const response = await callWithRequest(req, 'search', params);
  return response.hits?.hits.length ? response.hits?.hits[0]._source.timestamp : undefined;
}
