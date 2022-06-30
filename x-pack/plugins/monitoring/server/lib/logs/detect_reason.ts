/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegacyRequest } from '../../types';
import { createTimeFilter } from '../create_query';

export interface FilebeatIndexCheckOpts {
  start: number;
  end: number;
  clusterUuid?: string;
  nodeUuid?: string;
  indexUuid?: string;
}

async function doesFilebeatIndexExist(
  req: LegacyRequest,
  filebeatIndexPattern: string,
  { start, end, clusterUuid, nodeUuid, indexUuid }: FilebeatIndexCheckOpts
) {
  const metric = { timestampField: '@timestamp' };
  const filter = [createTimeFilter({ start, end, metric })];

  const typeFilter = { term: { 'service.type': 'elasticsearch' } };
  const structuredLogsFilter = { exists: { field: 'elasticsearch.cluster' } };
  const clusterFilter = { term: { 'elasticsearch.cluster.uuid': clusterUuid } };
  const nodeFilter = { term: { 'elasticsearch.node.id': nodeUuid } };
  const indexFilter = { term: { 'elasticsearch.index.name': indexUuid } };

  const indexPatternExistsQuery = {
    query: {
      bool: {
        filter,
      },
    },
  };

  const typeExistsAtAnyTimeQuery = {
    query: {
      bool: {
        filter: [typeFilter],
      },
    },
  };

  const typeExistsQuery = {
    query: {
      bool: {
        filter: [...filter, typeFilter],
      },
    },
  };

  const usingStructuredLogsQuery = {
    query: {
      bool: {
        filter: [...filter, typeFilter, structuredLogsFilter],
      },
    },
  };

  const clusterExistsQuery = {
    query: {
      bool: {
        filter: [...filter, typeFilter, clusterFilter],
      },
    },
  };

  const nodeExistsQuery = {
    query: {
      bool: {
        filter: [...filter, typeFilter, clusterFilter, nodeFilter],
      },
    },
  };

  const indexExistsQuery = {
    query: {
      bool: {
        filter: [...filter, typeFilter, clusterFilter, indexFilter],
      },
    },
  };

  const defaultParams = {
    size: 0,
  };

  const body = [
    { index: filebeatIndexPattern },
    { ...defaultParams },
    { index: filebeatIndexPattern },
    { ...defaultParams, ...indexPatternExistsQuery },
    { index: filebeatIndexPattern },
    { ...defaultParams, ...typeExistsAtAnyTimeQuery },
    { index: filebeatIndexPattern },
    { ...defaultParams, ...typeExistsQuery },
    { index: filebeatIndexPattern },
    { ...defaultParams, ...usingStructuredLogsQuery },
  ];

  if (clusterUuid) {
    body.push(...[{ index: filebeatIndexPattern }, { ...defaultParams, ...clusterExistsQuery }]);
  }

  if (nodeUuid) {
    body.push(...[{ index: filebeatIndexPattern }, { ...defaultParams, ...nodeExistsQuery }]);
  }

  if (indexUuid) {
    body.push(...[{ index: filebeatIndexPattern }, { ...defaultParams, ...indexExistsQuery }]);
  }

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const {
    responses: [
      indexPatternExistsResponse,
      indexPatternExistsInTimeRangeResponse,
      typeExistsAtAnyTimeResponse,
      typeExistsResponse,
      usingStructuredLogsResponse,
      clusterExistsResponse,
      nodeExistsResponse,
      indexExistsResponse,
    ],
  } = await callWithRequest(req, 'msearch', { body });

  return {
    indexPatternExists: (indexPatternExistsResponse?.hits?.total.value ?? 0) > 0,
    indexPatternInTimeRangeExists:
      (indexPatternExistsInTimeRangeResponse?.hits?.total.value ?? 0) > 0,
    typeExistsAtAnyTime: (typeExistsAtAnyTimeResponse?.hits?.total.value ?? 0) > 0,
    typeExists: (typeExistsResponse?.hits?.total.value ?? 0) > 0,
    usingStructuredLogs: (usingStructuredLogsResponse?.hits?.total.value ?? 0) > 0,
    clusterExists: clusterUuid ? (clusterExistsResponse?.hits?.total.value ?? 0) > 0 : null,
    nodeExists: nodeUuid ? (nodeExistsResponse?.hits?.total.value ?? 0) > 0 : null,
    indexExists: indexUuid ? (indexExistsResponse?.hits?.total.value ?? 0) > 0 : null,
  };
}

export async function detectReason(
  req: LegacyRequest,
  filebeatIndexPattern: string,
  opts: FilebeatIndexCheckOpts
) {
  return await doesFilebeatIndexExist(req, filebeatIndexPattern, opts);
}
