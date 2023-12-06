/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RetrievalQAChain } from 'langchain/chains';
import { ChainTool, Tool } from 'langchain/tools';

export const getEsqlLanguageKnowledgeBaseTool = ({
  assistantLangChain,
  modelExists,
  chain,
}: {
  assistantLangChain: boolean;
  chain: RetrievalQAChain;
  /** true when the ELSER model is installed */
  modelExists: boolean;
}): Tool | null =>
  assistantLangChain && modelExists
    ? new ChainTool({
        name: 'ESQLKnowledgeBaseTool',
        description:
          'Call this for knowledge on how to build an ESQL query, or answer questions about the ES|QL query language.',
        chain,
        tags: ['esql', 'query-generation', 'knowledge-base'],
      })
    : null;
