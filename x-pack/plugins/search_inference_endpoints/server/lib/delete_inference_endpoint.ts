/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

function isTaskType(type?: string): type is InferenceTaskType {
  return type
    ? ['sparse_embedding', 'text_embedding', 'rerank', 'completion'].includes(type)
    : true;
}

export const deleteInferenceEndpoint = async (
  client: ElasticsearchClient,
  type: string,
  id: string
) => {
  if (isTaskType(type)) {
    return await client.inference.deleteModel({ inference_id: id, task_type: type });
  }
};
