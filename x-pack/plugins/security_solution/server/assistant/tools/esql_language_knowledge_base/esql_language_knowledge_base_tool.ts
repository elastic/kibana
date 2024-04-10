/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { DynamicTool } from '@langchain/core/tools';
import { APP_UI_ID } from '../../../../common';

export type EsqlKnowledgeBaseToolParams = AssistantToolParams;

export const ESQL_KNOWLEDGE_BASE_TOOL: AssistantTool = {
  id: 'esql-knowledge-base-tool',
  name: 'ESQLKnowledgeBaseTool',
  description:
    'Call this for knowledge on how to build an ESQL query, or answer questions about the ES|QL query language.',
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is EsqlKnowledgeBaseToolParams => {
    const { isEnabledKnowledgeBase, modelExists } = params;
    return isEnabledKnowledgeBase && modelExists;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;
    const { chain } = params as EsqlKnowledgeBaseToolParams;
    return new DynamicTool({
      name: 'ESQLKnowledgeBaseTool',
      description:
        'Call this for knowledge on how to build an ESQL query, or answer questions about the ES|QL query language.',
      func: async (input, runManager, bb) => {
        console.log('inputinputinputinput', input);
        console.log('runManagerrunManager', runManager);
        console.log('bb', bb);
        const a = await chain.invoke({ query: input ?? '' }, bb);
        return JSON.stringify(a);
      },
      tags: ['esql', 'query-generation', 'knowledge-base'],
    });
  },
};
