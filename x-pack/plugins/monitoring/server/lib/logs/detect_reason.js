/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTimeFilter } from '../create_query';
import { get } from 'lodash';


async function doesFilebeatIndexExist(req, filebeatIndexPattern, { start, end, clusterUuid, nodeUuid }) {
  const metric = { timestampField: '@timestamp' };
  const filter = [
    createTimeFilter({ start, end, metric })
  ];

  const typeFilter = { term: { 'service.type': 'elasticsearch2' } };
  const clusterFilter = { term: { 'elasticsearch.cluster.uuid': clusterUuid } };
  const nodeFilter = { term: { 'elasticsearch.node.id': nodeUuid } };

  const indexPatternExistsQuery = {
    query: {
      bool: {
        filter,
      }
    },
  };

  const typeExistsQuery = {
    query: {
      bool: {
        filter: [
          ...filter,
          typeFilter,
        ]
      }
    },
  };

  const clusterExistsQuery = {
    query: {
      bool: {
        filter: [
          ...filter,
          typeFilter,
          clusterFilter
        ]
      }
    },
  };

  const nodeExistsQuery = {
    query: {
      bool: {
        filter: [
          ...filter,
          typeFilter,
          clusterFilter,
          nodeFilter
        ]
      }
    },
  };

  const defaultParams = {
    size: 0,
    terminate_after: 1,
  };

  const body = [
    { index: filebeatIndexPattern },
    { ...defaultParams, ...indexPatternExistsQuery },
    { index: filebeatIndexPattern },
    { ...defaultParams, ...typeExistsQuery },
  ];

  if (clusterUuid) {
    body.push(...[
      { index: filebeatIndexPattern },
      { ...defaultParams, ...clusterExistsQuery },
    ]);
  }

  if (nodeUuid) {
    body.push(...[
      { index: filebeatIndexPattern },
      { ...defaultParams, ...nodeExistsQuery },
    ]);
  }

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const {
    responses: [
      indexPatternExistsResponse,
      typeExistsResponse,
      clusterExistsResponse,
      nodeExistsResponse
    ]
  } = await callWithRequest(req, 'msearch', { body });

  return {
    indexPatternExists: get(indexPatternExistsResponse, 'hits.total.value', 0) > 0,
    typeExists: get(typeExistsResponse, 'hits.total.value', 0) > 0,
    clusterExists: get(clusterExistsResponse, 'hits.total.value', 0) > 0,
    nodeExists: get(nodeExistsResponse, 'hits.total.value', 0) > 0,
  };
}

export async function detectReason(req, filebeatIndexPattern, { start, end }) {
  return await doesFilebeatIndexExist(req, filebeatIndexPattern, { start, end });
}
