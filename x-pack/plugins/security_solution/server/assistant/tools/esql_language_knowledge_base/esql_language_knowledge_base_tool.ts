/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import type { Document } from 'langchain/document';
import { resolve } from 'path';
import { z } from '@kbn/zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { ESQL_RESOURCE } from '@kbn/elastic-assistant-plugin/server/routes/knowledge_base/constants';
import { APP_UI_ID } from '../../../../common';

const toolDetails = {
  description:
    'Call this for knowledge on how to build an ESQL query, or answer questions about the ES|QL query language. Input must always be the user query on a single line, with no other text. Your answer will be parsed as JSON, so never use quotes within the output and instead use backticks. Do not add any additional text to describe your output.',
  id: 'esql-knowledge-base-tool',
  name: 'ESQLKnowledgeBaseTool',
};
export const ESQL_KNOWLEDGE_BASE_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is AssistantToolParams => {
    const { kbDataClient, isEnabledKnowledgeBase, modelExists } = params;
    return isEnabledKnowledgeBase && modelExists && kbDataClient != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { kbDataClient } = params as AssistantToolParams;
    if (kbDataClient == null) return null;

    return new DynamicStructuredTool({
      name: toolDetails.name,
      description: toolDetails.description,
      schema: z.object({
        question: z.string().describe(`The user's exact question about ESQL`),
      }),
      func: async (input) => {
        const exampleQueriesLoader = new DirectoryLoader(
          resolve(
            __dirname,
            '../../../../../elastic_assistant/server/knowledge_base/esql/example_queries'
          ),
          {
            '.asciidoc': (path) => new TextLoader(path),
          },
          true
        );
        const rawExampleQueries = await exampleQueriesLoader.load();

        const docs = await kbDataClient.getKnowledgeBaseDocumentEntries({
          kbResource: ESQL_RESOURCE,
          query: input.question,
        });

        let legacyDocs: Document[] = [];

        if (!kbDataClient?.isV2KnowledgeBaseEnabled) {
          legacyDocs = await kbDataClient.getKnowledgeBaseDocumentEntries({
            kbResource: 'unknown',
            query: input.question,
          });
        }

        return JSON.stringify([...rawExampleQueries, ...docs, ...legacyDocs]).substring(0, 50000);
      },
      tags: ['esql', 'query-generation', 'knowledge-base'],
      // TODO: Remove after ZodAny is fixed https://github.com/langchain-ai/langchainjs/blob/main/langchain-core/src/tools.ts
    }) as unknown as DynamicStructuredTool;
  },
};
