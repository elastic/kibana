/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkParam } from '../error_missing_required';
import { createTimeFilter, TimerangeFilter } from '../create_query';
import { detectReason } from './detect_reason';
import { detectReasonFromException } from './detect_reason_from_exception';
import { LegacyRequest } from '../../types';
import { LogsResponse } from '../../../common/types/logs';
import { elasticsearchLogsFilter } from './logs_filter';

interface LogType {
  level?: string;
  count?: number;
}

async function handleResponse(
  response: LogsResponse,
  req: LegacyRequest,
  logsIndexPattern: string,
  opts: { clusterUuid?: string; nodeUuid?: string; indexUuid?: string; start: number; end: number }
) {
  const result: { enabled: boolean; types: LogType[]; reason?: any } = {
    enabled: false,
    types: [],
  };

  const typeBuckets = response.aggregations?.types?.buckets ?? [];
  if (typeBuckets.length) {
    result.enabled = true;
    result.types = typeBuckets.map((typeBucket: any) => {
      return {
        type: typeBucket.key.split('.')[1],
        levels: typeBucket.levels.buckets.map((levelBucket: any) => {
          return {
            level: levelBucket.key.toLowerCase(),
            count: levelBucket.doc_count,
          };
        }),
      };
    });
  } else {
    result.reason = await detectReason(req, logsIndexPattern, opts);
  }

  return result;
}

export async function getLogTypes(
  req: LegacyRequest,
  logsIndexPattern: string,
  {
    clusterUuid,
    nodeUuid,
    indexUuid,
    start,
    end,
  }: { clusterUuid?: string; nodeUuid?: string; indexUuid?: string; start: number; end: number }
) {
  checkParam(logsIndexPattern, 'logsIndexPattern in logs/getLogTypes');

  const metric = { timestampField: '@timestamp' };

  const filter: Array<{ term: { [x: string]: string } } | TimerangeFilter | null> = [
    createTimeFilter({ start, end, metric }),
  ];

  if (clusterUuid) {
    filter.push({ term: { 'elasticsearch.cluster.uuid': clusterUuid } });
  }
  if (nodeUuid) {
    filter.push({ term: { 'elasticsearch.node.id': nodeUuid } });
  }
  if (indexUuid) {
    filter.push({ term: { 'elasticsearch.index.name': indexUuid } });
  }

  const params = {
    index: logsIndexPattern,
    size: 0,
    filter_path: ['aggregations.levels.buckets', 'aggregations.types.buckets'],
    ignore_unavailable: true,
    body: {
      sort: { '@timestamp': { order: 'desc', unmapped_type: 'long' } },
      query: {
        bool: {
          filter: [elasticsearchLogsFilter, ...filter],
        },
      },
      aggs: {
        types: {
          terms: {
            field: 'event.dataset',
          },
          aggs: {
            levels: {
              terms: {
                field: 'log.level',
              },
            },
          },
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  let result: { enabled: boolean; types: LogType[]; reason?: any } = {
    enabled: false,
    types: [],
  };
  try {
    const response = await callWithRequest(req, 'search', params);
    result = await handleResponse(response, req, logsIndexPattern, {
      clusterUuid,
      nodeUuid,
      indexUuid,
      start,
      end,
    });
  } catch (err) {
    result.reason = detectReasonFromException(err);
  }
  return result;
}
