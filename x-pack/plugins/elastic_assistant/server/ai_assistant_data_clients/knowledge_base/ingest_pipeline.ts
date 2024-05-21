/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';

export const knowledgeBaseIngestPipeline = ({
  id,
  modelId,
}: {
  id: string;
  modelId: string;
}): IngestPutPipelineRequest => ({
  id,
  description: 'Embedding pipeline for Elastic AI Assistant ELSER Knowledge Base',
  processors: [
    {
      inference: {
        model_id: modelId,
        target_field: 'vector',
        field_map: {
          text: 'text_field',
        },
        inference_config: {
          // @ts-expect-error
          text_expansion: {
            results_field: 'tokens',
          },
        },
      },
    },
  ],
});
