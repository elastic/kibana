/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RetrievalQAChain } from 'langchain/chains';
import { DynamicTool } from 'langchain/tools';

import { getEsqlLanguageKnowledgeBaseTool } from './get_esql_language_knowledge_base_tool';

const chain = {} as RetrievalQAChain;

describe('getEsqlLanguageKnowledgeBaseTool', () => {
  it('returns null if assistantLangChain is false', () => {
    const tool = getEsqlLanguageKnowledgeBaseTool({
      assistantLangChain: false,
      chain,
      modelExists: true,
    });

    expect(tool).toBeNull();
  });

  it('returns null if modelExists is false (the ELSER model is not installed)', () => {
    const tool = getEsqlLanguageKnowledgeBaseTool({
      assistantLangChain: true,
      chain,
      modelExists: false, // <-- ELSER model is not installed
    });

    expect(tool).toBeNull();
  });

  it('should return a Tool instance if assistantLangChain and modelExists are true', () => {
    const tool = getEsqlLanguageKnowledgeBaseTool({
      assistantLangChain: true,
      modelExists: true,
      chain,
    });

    expect(tool?.name).toEqual('ESQLKnowledgeBaseTool');
  });

  it('should return a tool with the expected tags', () => {
    const tool = getEsqlLanguageKnowledgeBaseTool({
      assistantLangChain: true,
      chain,
      modelExists: true,
    }) as DynamicTool;

    expect(tool.tags).toEqual(['esql', 'query-generation', 'knowledge-base']);
  });
});
