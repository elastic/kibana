/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPipeline, IngestSimulateDocument } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

export const simulatePipeline = async (
  pipelineBody: IngestPipeline,
  documents: IngestSimulateDocument[],
  client: ElasticsearchClient
) => {
  return await client.ingest.simulate({
    docs: documents,
    pipeline: pipelineBody,
  });
};
