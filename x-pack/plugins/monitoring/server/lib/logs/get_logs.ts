/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
// @ts-ignore
import { checkParam } from '../error_missing_required';
// @ts-ignore
import { createTimeFilter } from '../create_query';
// @ts-ignore
import { detectReason } from './detect_reason';
// @ts-ignore
import { formatUTCTimestampForTimezone } from '../format_timezone';
// @ts-ignore
import { getTimezone } from '../get_timezone';
// @ts-ignore
import { detectReasonFromException } from './detect_reason_from_exception';
import { LegacyRequest } from '../../types';
import { FilebeatResponse } from '../../../common/types/filebeat';
import { MonitoringConfig } from '../../config';

interface Log {
  timestamp?: string | number;
  component?: string;
  node?: string;
  index?: string;
  level?: string;
  type?: string;
  message?: string;
}

async function handleResponse(
  response: FilebeatResponse,
  req: LegacyRequest,
  filebeatIndexPattern: string,
  opts: { clusterUuid: string; nodeUuid: string; indexUuid: string; start: number; end: number }
) {
  const result: { enabled: boolean; logs: Log[]; reason?: any } = {
    enabled: false,
    logs: [],
  };

  const timezone = await getTimezone(req);
  const hits = response.hits?.hits ?? [];
  if (hits.length) {
    result.enabled = true;
    result.logs = hits.map((hit) => {
      const source = hit._source;
      const type = (source.event?.dataset ?? '').split('.')[1];
      const utcTimestamp = moment(source['@timestamp']).valueOf();

      return {
        timestamp: formatUTCTimestampForTimezone(utcTimestamp, timezone),
        component: source.elasticsearch?.component,
        node: source.elasticsearch?.node?.name,
        index: source.elasticsearch?.index?.name,
        level: source.log?.level,
        type,
        message: source.message,
      };
    });
  } else {
    result.reason = await detectReason(req, filebeatIndexPattern, opts);
  }

  return result;
}

export async function getLogs(
  config: MonitoringConfig,
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
  checkParam(filebeatIndexPattern, 'filebeatIndexPattern in logs/getLogs');

  const metric = { timestampField: '@timestamp' };
  const filter: any[] = [
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
    size: Math.min(50, config.ui.elasticsearch.logFetchCount),
    filter_path: [
      'hits.hits._source.message',
      'hits.hits._source.log.level',
      'hits.hits._source.@timestamp',
      'hits.hits._source.event.dataset',
      'hits.hits._source.elasticsearch.component',
      'hits.hits._source.elasticsearch.index.name',
      'hits.hits._source.elasticsearch.node.name',
    ],
    ignore_unavailable: true,
    body: {
      sort: { '@timestamp': { order: 'desc', unmapped_type: 'long' } },
      query: {
        bool: {
          filter,
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

  let result: { enabled: boolean; logs: Log[]; reason?: any } = {
    enabled: false,
    logs: [],
  };
  try {
    const response: FilebeatResponse = await callWithRequest(req, 'search', params);
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

  return {
    ...result,
    limit: params.size,
  };
}
