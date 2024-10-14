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

const summarizeDocumentSchema = {
  type: 'object',
  properties: {
    useful: {
      type: 'boolean',
      description: `Whether the provided document has any useful information related to the user's query.`,
    },
    summary: {
      type: 'string',
      description: `The condensed version of the document that can be used to answer the question. Can be empty.`,
    },
  },
  required: ['useful'],
} as const satisfies ToolSchema;

interface SummarizeDocumentResponse {
  summary: string;
}

export const summarizeDocument = async ({
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
}): Promise<SummarizeDocumentResponse> => {
  const result = await lastValueFrom(
    outputAPI('extract_relevant_chunks', {
      connectorId,
      functionCalling,
      system: `You are an Elastic assistant in charge of helping answering the user question.

      Given a question and a document, please provide a condensed version of the document
      that can be used to answer the question.
      - All useful information should be included in the condensed version.
      - If you think the document isn't relevant at all to answer the question, return an empty text.
      `,
      input: `
      ## User question

      ${searchTerm}

      ## Document

      ${documentContent}
      `,
      schema: summarizeDocumentSchema,
    }).pipe(withoutOutputUpdateEvents())
  );

  return {
    summary: result.output.summary ?? '',
  };
};
