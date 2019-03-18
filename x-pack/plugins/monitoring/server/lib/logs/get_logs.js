/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { createTimeFilter } from '../create_query';
import { detectReason } from './detect_reason';

async function handleResponse(response, req, filebeatIndexPattern, { clusterUuid, nodeUuid, start, end }) {
  const result = {
    enabled: false,
    logs: []
  };

  const hits = get(response, 'hits.hits', []);
  if (hits.length) {
    result.enabled = true;
    result.logs = hits.map(hit => {
      const source = hit._source;
      const type = get(source, 'event.dataset').split('.')[1];

      return {
        timestamp: get(source, 'event.created'),
        component: get(source, 'elasticsearch.component'),
        index: get(source, 'elasticsearch.index.name'),
        level: get(source, 'log.level'),
        type,
        message: get(source, 'message'),
      };
    });
  }
  else {
    result.reason = await detectReason(req, filebeatIndexPattern, { start, end, clusterUuid, nodeUuid });
  }

  return result;
}

export async function getLogs(config, req, filebeatIndexPattern, { clusterUuid, nodeUuid, start, end }) {
  checkParam(filebeatIndexPattern, 'filebeatIndexPattern in logs/getLogs');

  const metric = { timestampField: 'event.created' };
  const filter = [
    { term: { 'service.type': 'elasticsearch' } },
    createTimeFilter({ start, end, metric })
  ];
  if (clusterUuid) {
    filter.push({ term: { 'elasticsearch.cluster.uuid': clusterUuid } });
  }
  if (nodeUuid) {
    filter.push({ term: { 'elasticsearch.node.id': nodeUuid } });
  }

  const params = {
    index: filebeatIndexPattern,
    size: Math.min(50, config.get('xpack.monitoring.elasticsearch.logFetchCount')),
    filterPath: [
      'hits.hits._source.message',
      'hits.hits._source.log.level',
      'hits.hits._source.event.created',
      'hits.hits._source.event.dataset',
      'hits.hits._source.elasticsearch.component',
      'hits.hits._source.elasticsearch.index.name',
    ],
    ignoreUnavailable: true,
    body: {
      sort: { 'event.created': { order: 'desc' } },
      query: {
        bool: {
          filter,
        }
      }
    }
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);
  return await handleResponse(response, req, filebeatIndexPattern, { clusterUuid, nodeUuid, start, end });
}
