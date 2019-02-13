/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { createTimeFilter } from '../create_query';

function handleResponse(response) {
  return get(response, 'hits.hits', [])
    .map(hit => {
      const source = hit._source;

      return {
        timestamp: get(source, 'event.created'),
        component: get(source, 'elasticsearch.component'),
        index: get(source, 'elasticsearch.index.name'),
        level: get(source, 'log.level'),
        message: get(source, 'message'),
      };
    });
}

export async function getLogs(req, filebeatIndexPattern, { clusterUuid, nodeUuid, start, end }) {
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
    size: 10, //config.get('xpack.monitoring.max_bucket_size'),
    filterPath: [
      'hits.hits._source.message',
      'hits.hits._source.log.level',
      'hits.hits._source.event.created',
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
  return handleResponse(response);
}
