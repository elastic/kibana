/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesGetIndexTemplateRequest,
  IndicesGetIndexTemplateResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export async function getIndexTemplate(
  esClient: ElasticsearchClient,
  params: IndicesGetIndexTemplateRequest
): Promise<IndicesGetIndexTemplateResponse> {
  try {
    return await esClient.indices.getIndexTemplate(params, {
      signal: new AbortController().signal,
    });
  } catch (e) {
    if (e instanceof errors.ResponseError && e.statusCode === 404) {
      return { index_templates: [] };
    }

    throw e;
  }
}
