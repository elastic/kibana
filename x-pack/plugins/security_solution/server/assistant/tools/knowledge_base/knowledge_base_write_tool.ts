/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { AIAssistantKnowledgeBaseDataClient } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/knowledge_base';
import type { KnowledgeBaseEntryCreateProps } from '@kbn/elastic-assistant-common';
import { APP_UI_ID } from '../../../../common';

export interface KnowledgeBaseWriteToolParams extends AssistantToolParams {
  kbDataClient: AIAssistantKnowledgeBaseDataClient;
}

const toolDetails = {
  description:
    "Call this for writing details to the user's knowledge base. The knowledge base contains useful information the user wants to store between conversation contexts. Input will be the summarized knowledge base entry to store, with no other text, and whether or not the entry is required.",
  id: 'knowledge-base-write-tool',
  name: 'KnowledgeBaseWriteTool',
};
export const KNOWLEDGE_BASE_WRITE_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is KnowledgeBaseWriteToolParams => {
    const { isEnabledKnowledgeBase, kbDataClient, modelExists } = params;
    return isEnabledKnowledgeBase && modelExists && kbDataClient != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { kbDataClient, logger } = params as KnowledgeBaseWriteToolParams;
    if (kbDataClient == null) return null;

    return new DynamicStructuredTool({
      name: toolDetails.name,
      description: toolDetails.description,
      schema: z.object({
        query: z.string().describe(`Summary of items/things to save in the knowledge base`),
        required: z
          .boolean()
          .describe(
            `Whether or not the entry is required to always be included in conversations. Is only true if the user explicitly asks for it to be required or always included in conversations, otherwise this is always false.`
          ),
      }),
      func: async (input, _, cbManager) => {
        logger.debug(`KnowledgeBaseWriteToolParams:input\n ${JSON.stringify(input, null, 2)}`);

        const knowledgeBaseEntry: KnowledgeBaseEntryCreateProps = {
          metadata: { kbResource: 'user', source: 'conversation', required: input.required },
          text: input.query,
        };

        logger.debug(`knowledgeBaseEntry\n ${JSON.stringify(knowledgeBaseEntry, null, 2)}`);

        const resp = await kbDataClient.createKnowledgeBaseEntry({ knowledgeBaseEntry });

        if (resp == null) {
          return "I'm sorry, but I was unable to add this entry to your knowledge base.";
        }
        return "I've successfully saved this entry to your knowledge base. You can ask me to recall this information at any time.";
      },
      tags: ['knowledge-base'],
    });
  },
};
