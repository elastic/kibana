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

export type KnowledgeBaseRetrievalToolParams = AssistantToolParams;

const toolDetails = {
  description:
    "Call this for fetching details from the user's knowledge base. The knowledge base contains useful information the user wants to store between conversation contexts. Call this function when the user asks for information about themself, like 'what is my favorite...' or 'using my saved....'. Input must always be the free-text query on a single line, with no other text. You are welcome to re-write the query to be a summary of items/things to search for in the knowledge base, as a vector search will be performed to return similar results when requested. If the results returned do not look relevant, disregard and tell the user you were unable to find the information they were looking for.",
  id: 'knowledge-base-retrieval-tool',
  name: 'KnowledgeBaseRetrievalTool',
};
export const KNOWLEDGE_BASE_RETRIEVAL_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is KnowledgeBaseRetrievalToolParams => {
    const { chain, isEnabledKnowledgeBase, modelExists } = params;
    return isEnabledKnowledgeBase && modelExists && chain != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { chain, logger } = params as KnowledgeBaseRetrievalToolParams;
    if (chain == null) return null;

    return new DynamicStructuredTool({
      name: toolDetails.name,
      description: toolDetails.description,
      schema: z.object({
        query: z.string().describe(`Summary of items/things to search for in the knowledge base`),
      }),
      func: async (input, _, cbManager) => {
        logger.debug(`KnowledgeBaseRetrievalToolParams:input\n ${JSON.stringify(input, null, 2)}`);
        const result = await chain.invoke(
          {
            query: input.query,
          },
          cbManager
        );
        return result.text;
      },
      tags: ['knowledge-base'],
    });
  },
};
