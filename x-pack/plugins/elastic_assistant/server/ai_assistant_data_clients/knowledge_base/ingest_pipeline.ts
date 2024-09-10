/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: Ensure old pipeline is updated/replaced
export const knowledgeBaseIngestPipeline = ({ id, modelId }: { id: string; modelId: string }) => ({
  id,
  description: 'Embedding pipeline for Elastic AI Assistant ELSER Knowledge Base',
  processors: [
    {
      inference: {
        if: 'ctx?.text != null',
        model_id: modelId,
        input_output: [
          {
            input_field: 'text',
            output_field: 'vector.tokens',
          },
        ],
      },
    },
  ],
});
