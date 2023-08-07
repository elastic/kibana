/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterFunctionDefinition } from '../../common/types';
import type { ObservabilityAIAssistantService } from '../types';

export function registerSummarisationFunction({
  service,
  registerFunction,
}: {
  service: ObservabilityAIAssistantService;
  registerFunction: RegisterFunctionDefinition;
}) {
  registerFunction(
    {
      name: 'summarise',
      contexts: ['core'],
      description:
        'Use this function to summarise things learned from the conversation. You can score the learnings with a confidence metric, whether it is a correction on a previous learning. An embedding will be created that you can recall later with a semantic search. There is no need to ask the user for permission to store something you have learned, unless you do not feel confident.',
      descriptionForUser:
        'This function allows the Elastic Assistant to summarise things from the conversation.',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description:
              'An id for the document. This should be a short human-readable keyword field with only alphabetic characters and underscores, that allow you to update it later.',
          },
          text: {
            type: 'string',
            description:
              'A human-readable summary of what you have learned, described in such a way that you can recall it later with semantic search.',
          },
          is_correction: {
            type: 'boolean',
            description: 'Whether this is a correction for a previous learning.',
          },
          confidence: {
            type: 'string',
            description: 'How confident you are about this being a correct and useful learning',
            enum: ['low' as const, 'medium' as const, 'high' as const],
          },
          public: {
            type: 'boolean',
            description:
              'Whether this information is specific to the user, or generally applicable to any user of the product',
          },
        },
        required: [
          'id' as const,
          'text' as const,
          'is_correction' as const,
          'confidence' as const,
          'public' as const,
        ],
      },
    },
    (
      { arguments: { id, text, is_correction: isCorrection, confidence, public: isPublic } },
      signal
    ) => {
      return service
        .callApi('POST /internal/observability_ai_assistant/functions/summarise', {
          params: {
            body: {
              id,
              text,
              is_correction: isCorrection,
              confidence,
              public: isPublic,
            },
          },
          signal,
        })
        .then(() => ({
          content: {
            message: `The document has been stored`,
          },
        }));
    }
  );
}
