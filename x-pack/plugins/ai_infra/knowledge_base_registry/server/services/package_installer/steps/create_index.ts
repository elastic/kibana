/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const createIndex = async ({
  esClient,
  indexName,
  mappings,
  log,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
  mappings: MappingTypeMapping;
  log: Logger;
}) => {
  log.debug(`Creating index ${indexName}`);

  // TODO: extract / do it right
  mappings.properties.ai_questions_answered.inference_id = 'default-elser';
  mappings.properties.ai_subtitle.inference_id = 'default-elser';
  mappings.properties.ai_summary.inference_id = 'default-elser';
  mappings.properties.content_body.inference_id = 'default-elser';

  await esClient.indices.create({
    index: indexName,
    mappings,
    settings: {
      number_of_shards: 1,
      auto_expand_replicas: '0-1',
    },
  });
};
