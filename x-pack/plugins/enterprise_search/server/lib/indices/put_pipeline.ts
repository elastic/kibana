/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

export const putPipeline = async (
  pipelineId: string,
  pipelineBody: IngestPipeline,
  client: ElasticsearchClient
) => {
  return await client.ingest.putPipeline({
    ...{ id: pipelineId },
    ...pipelineBody,
  });
};
