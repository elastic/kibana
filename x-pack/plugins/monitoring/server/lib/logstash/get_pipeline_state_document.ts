/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createQuery } from '../create_query';
import { LogstashMetric } from '../metrics';
import { LegacyRequest, PipelineVersion } from '../../types';
import { ElasticsearchResponse } from '../../../common/types/es';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { Globals } from '../../static_globals';

export async function getPipelineStateDocument({
  req,
  clusterUuid,
  pipelineId,
  version,
}: {
  req: LegacyRequest;
  clusterUuid: string;
  pipelineId: string;
  version: PipelineVersion;
}) {
  const dataset = 'node';
  const type = 'logstash_state';
  const moduleType = 'logstash';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    moduleType,
    dataset,
  });
  const { callWithRequest } = req.server.plugins?.elasticsearch.getCluster('monitoring');
  const filters = [
    { term: { 'logstash_state.pipeline.id': pipelineId } },
    { term: { 'logstash_state.pipeline.hash': version.hash } },
  ];

  const query = createQuery({
    // We intentionally do not set a start/end time for the state document
    // The reason being that any matching document will work since they are all identical if they share a given hash
    // This is important because a user may pick a very narrow time picker window. If we were to use a start/end value
    // that could result in us being unable to render the graph
    // Use the logstash_stats documents to determine whether the instance is up/down
    type,
    dsDataset: `${moduleType}.${dataset}`,
    metricset: dataset,
    metric: LogstashMetric.getMetricFields(),
    clusterUuid,
    filters,
  });

  const params = {
    index: indexPatterns,
    size: 1,
    ignore_unavailable: true,
    body: {
      _source: { excludes: 'logstash_state.pipeline.representation.plugins' },
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query,
      terminate_after: 1, // Safe to do because all these documents are functionally identical
    },
  };

  const resp = (await callWithRequest(req, 'search', params)) as ElasticsearchResponse;
  // Return null if doc not found
  return resp.hits?.hits[0]?._source ?? null;
}
