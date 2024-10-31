/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { StreamDefinition } from '../../../../common/types';
import { ASSET_VERSION, STREAMS_INDEX } from '../../../../common/constants';

interface GenerateReroutePipelineParams {
  esClient: ElasticsearchClient;
  definition: StreamDefinition;
}

export async function generateReroutePipeline({
  esClient,
  definition,
}: GenerateReroutePipelineParams) {
  const response = await esClient.search<StreamDefinition>({
    index: STREAMS_INDEX,
    query: { match: { forked_from: definition.id } },
  });

  return {
    id: `${definition.id}@reroutes`,
    processors: response.hits.hits.map((doc) => {
      return {
        reroute: {
          dataset: doc._source.dataset,
          if: doc._source.condition,
        },
      };
    }),
    _meta: {
      description: `Reoute pipeline for the ${definition.id} StreamEntity`,
      managed: true,
    },
    version: ASSET_VERSION,
  };
}
