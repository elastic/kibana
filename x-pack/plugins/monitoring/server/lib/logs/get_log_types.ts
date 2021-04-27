/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import { checkParam } from '../error_missing_required';
// @ts-ignore
import { createTimeFilter } from '../create_query';
// @ts-ignore
import { detectReason } from './detect_reason';
// @ts-ignore
import { detectReasonFromException } from './detect_reason_from_exception';
import { LegacyRequest } from '../../types';
import { FilebeatResponse } from '../../../common/types/filebeat';

interface LogType {
  level?: string;
  count?: number;
}

async function handleResponse(
  response: FilebeatResponse,
  req: LegacyRequest,
  filebeatIndexPattern: string,
  opts: { clusterUuid: string; nodeUuid: string; indexUuid: string; start: number; end: number }
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
    result.reason = await detectReason(req, filebeatIndexPattern, opts);
  }

  return result;
}

export async function getLogTypes(
  req: LegacyRequest,
  filebeatIndexPattern: string,
  {
    clusterUuid,
    nodeUuid,
    indexUuid,
    start,
    end,
  }: { clusterUuid: string; nodeUuid: string; indexUuid: string; start: number; end: number }
) {
  checkParam(filebeatIndexPattern, 'filebeatIndexPattern in logs/getLogTypes');

  const metric = { timestampField: '@timestamp' };
  const filter = [
    { term: { 'service.type': 'elasticsearch' } },
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
    index: filebeatIndexPattern,
    size: 0,
    filterPath: ['aggregations.levels.buckets', 'aggregations.types.buckets'],
    ignoreUnavailable: true,
    body: {
      sort: { '@timestamp': { order: 'desc', unmapped_type: 'long' } },
      query: {
        bool: {
          filter,
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
    result = await handleResponse(response, req, filebeatIndexPattern, {
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
