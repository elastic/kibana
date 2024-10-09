/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import type { ToolSchema } from '@kbn/inference-plugin/common';
import type { FunctionCallingMode } from '@kbn/inference-plugin/common/chat_complete';
import type { OutputAPI } from '@kbn/inference-plugin/common/output';
import { withoutOutputUpdateEvents } from '@kbn/inference-plugin/common/output/without_output_update_events';

const extractRelevantChunksSchema = {
  type: 'object',
  properties: {
    useful: {
      type: 'boolean',
      description: `Whether the provided document has any useful information related to the user's query`,
    },
    chunks: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: `The chunks of text of the document that are relevant to the user's query. Can be empty`,
    },
  },
  required: ['useful'],
} as const satisfies ToolSchema;

interface ExtractRelevantChunksResponse {
  chunks: string[];
}

export const extractRelevantChunks = async ({
  searchTerm,
  documentContent,
  connectorId,
  outputAPI,
  functionCalling,
}: {
  searchTerm: string;
  documentContent: string;
  outputAPI: OutputAPI;
  connectorId: string;
  functionCalling?: FunctionCallingMode;
}): Promise<ExtractRelevantChunksResponse> => {
  const result = await lastValueFrom(
    outputAPI('extract_relevant_chunks', {
      connectorId,
      functionCalling,
      system: `You are an Elastic assistant in charge of helping answering the user question

      Given a search query and a document, your current task will be to extract
      the parts of the document that could be useful in answering the question.

      - If multiple parts are useful, return them all.
      - If you think nothing in the document could help answering the question, return an empty list.
      `,
      input: `
      ## Search query

      ${searchTerm}

      ## Document

      ${documentContent}
      `,
      schema: extractRelevantChunksSchema,
    }).pipe(withoutOutputUpdateEvents())
  );

  return {
    chunks: result.output.chunks ?? [],
  };
};
