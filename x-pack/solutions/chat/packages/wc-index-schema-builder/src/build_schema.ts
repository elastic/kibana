/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { IndexSourceDefinition } from '@kbn/wci-common';
import { createSchemaGraph } from './workflows/build_index_schema';

export const buildSchema = async ({
  indexName,
  esClient,
  logger,
  chatModel,
}: {
  indexName: string;
  logger: Logger;
  chatModel: InferenceChatModel;
  esClient: ElasticsearchClient;
}): Promise<IndexSourceDefinition> => {
  const graph = await createSchemaGraph({ chatModel, esClient, logger });

  const output = await graph.invoke({ indexName });

  return output.generatedDefinition as IndexSourceDefinition;
};
