/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { checkParam } from '../error_missing_required';
import { createTimeFilter, TimerangeFilter } from '../create_query';
import { detectReason, LogsIndexCheckOpts } from './detect_reason';
import { elasticsearchLogsFilter } from './logs_filter';
import { formatUTCTimestampForTimezone } from '../format_timezone';
import { getTimezone } from '../get_timezone';
import { detectReasonFromException } from './detect_reason_from_exception';
import { LegacyRequest } from '../../types';
import { LogsResponse } from '../../../common/types/logs';
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
  response: LogsResponse,
  req: LegacyRequest,
  logsIndexPattern: string,
  opts: LogsIndexCheckOpts
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
    result.reason = await detectReason(req, logsIndexPattern, opts);
  }

  return result;
}

export async function getLogs(
  config: MonitoringConfig,
  req: LegacyRequest,
  logsIndexPattern: string,
  { clusterUuid, nodeUuid, indexUuid, start, end }: LogsIndexCheckOpts
) {
  checkParam(logsIndexPattern, 'logsIndexPattern in logs/getLogs');

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
          filter: [elasticsearchLogsFilter, ...filter],
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
    const response: LogsResponse = await callWithRequest(req, 'search', params);
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

  return {
    ...result,
    limit: params.size,
  };
}
