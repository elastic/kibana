/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionRegistrationParameters } from '.';
import { KnowledgeBaseEntryRole } from '../../common';

export function registerSummarizationFunction({
  client,
  functions,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: 'summarize',
      contexts: ['core'],
      description:
        "Use this function to summarize things learned from the conversation. You can score the learnings with a confidence metric, whether it is a correction on a previous learning. An embedding will be created that you can recall later with a semantic search. There is no need to ask the user for permission to store something you have learned, unless you do not feel confident. When you create this summarisation, make sure you craft it in a way that can be recalled with a semantic search later, and that it would have answered the user's original request.",
      descriptionForUser:
        'This function allows the Elastic Assistant to summarize things from the conversation.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {
            type: 'string',
            description:
              'An id for the document. This should be a short human-readable keyword field with only alphabetic characters and underscores, that allow you to update it later.',
          },
          text: {
            type: 'string',
            description:
              "A human-readable summary of what you have learned, described in such a way that you can recall it later with semantic search, and that it would have answered the user's original request.",
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
      return client
        .createKnowledgeBaseEntry({
          entry: {
            doc_id: id,
            role: KnowledgeBaseEntryRole.AssistantSummarization,
            id,
            text,
            is_correction: isCorrection,
            confidence,
            public: isPublic,
            labels: {},
          },
          // signal,
        })
        .then(() => ({
          content: {
            message: `The document has been stored`,
          },
        }));
    }
  );
}
