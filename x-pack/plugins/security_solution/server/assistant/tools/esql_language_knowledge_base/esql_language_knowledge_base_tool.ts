/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { APP_UI_ID } from '../../../../common';

export type EsqlKnowledgeBaseToolParams = AssistantToolParams;

const toolDetails = {
  description:
    'Call this for knowledge on how to build an ESQL query, or answer questions about the ES|QL query language. Input must always be the query on a single line, with no other text. Only output valid ES|QL queries as described above. Do not add any additional text to describe your output.',
  id: 'esql-knowledge-base-tool',
  name: 'ESQLKnowledgeBaseTool',
};
export const ESQL_KNOWLEDGE_BASE_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is EsqlKnowledgeBaseToolParams => {
    const { chain, isEnabledKnowledgeBase, modelExists } = params;
    return isEnabledKnowledgeBase && modelExists && chain != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { chain } = params as EsqlKnowledgeBaseToolParams;
    if (chain == null) return null;

    return new DynamicStructuredTool({
      name: toolDetails.name,
      description: toolDetails.description,
      schema: z.object({
        question: z.string().describe(`The user's exact question about ESQL`),
      }),
      func: async (input, _, cbManager) => {
        const result = await chain.invoke(
          {
            query: input.question,
          },
          cbManager
        );
        return result.text;
      },
      tags: ['esql', 'query-generation', 'knowledge-base'],
    });
  },
};
