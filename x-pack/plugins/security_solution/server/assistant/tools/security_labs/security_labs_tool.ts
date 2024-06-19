/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';

import { z } from 'zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { ElasticsearchStore } from '@kbn/elastic-assistant-plugin/server/lib/langchain/elasticsearch_store/elasticsearch_store';
import { SECURITY_LABS_RESOURCE } from '@kbn/elastic-assistant-plugin/server/routes/knowledge_base/constants';
import { APP_UI_ID } from '../../../../common';

export interface SecurityLabsKnowledgeBaseToolParams extends AssistantToolParams {
  esStore: ElasticsearchStore;
}

const toolDetails = {
  description:
    'Call this for knowledge from Elastic Security Labs content, which contains information on malware, attack techniques, and more.',
  id: 'security-labs-knowledge-base-tool',
  name: 'SecurityLabsKnowledgeBaseTool',
};
export const SECURITY_LABS_KNOWLEDGE_BASE_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is SecurityLabsKnowledgeBaseToolParams => {
    const { esStore, isEnabledKnowledgeBase, modelExists } = params;
    return isEnabledKnowledgeBase && modelExists && esStore != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { esStore } = params as SecurityLabsKnowledgeBaseToolParams;
    if (esStore == null) return null;

    return new DynamicStructuredTool({
      name: toolDetails.name,
      description: toolDetails.description,
      schema: z.object({
        question: z
          .string()
          .describe(
            `Key terms to retrieve Elastic Security Labs content for, like specific malware names or attack techniques.`
          ),
      }),
      func: async (input, _, cbManager) => {
        esStore.setKbResource(SECURITY_LABS_RESOURCE);
        const docs = await esStore.similaritySearch(input.question, 2, undefined, undefined, false);
        // TODO: Token pruning
        return JSON.stringify(docs).substring(0, 20000);
      },
      tags: ['security-labs', 'knowledge-base'],
    });
  },
};
