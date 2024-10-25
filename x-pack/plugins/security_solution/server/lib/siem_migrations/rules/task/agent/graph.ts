/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { migrateRuleState } from './state';
import type { MigrateRuleGraphParams, MigrateRuleState } from './types';
import { getEsqlTranslationPrompt } from './prompts';
import { getEsqlKnowledgeBase, type EsqlKnowledgeBaseCaller } from './esql_knowledge_base_caller';

type GraphNode = (state: MigrateRuleState) => Promise<Partial<MigrateRuleState>>;

const createTranslationNode = (esqlKnowledgeBaseCaller: EsqlKnowledgeBaseCaller): GraphNode => {
  return async (state) => {
    const input = getEsqlTranslationPrompt(state);
    const response = await esqlKnowledgeBaseCaller(input);
    return { messages: [new AIMessage(response)] };
  };
};

const responseNode: GraphNode = async (state) => {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  return { response: lastMessage.content as string };
};

export function getMigrateRuleGraph({
  inferenceClient,
  connectorId,
  logger,
}: MigrateRuleGraphParams) {
  const esqlKnowledgeBaseCaller = getEsqlKnowledgeBase({ inferenceClient, connectorId, logger });
  const translationNode = createTranslationNode(esqlKnowledgeBaseCaller);

  const translateRuleGraph = new StateGraph(migrateRuleState)
    // Nodes
    .addNode('translation', translationNode)
    .addNode('processResponse', responseNode)
    // Edges
    .addEdge(START, 'translation')
    .addEdge('translation', 'processResponse')
    .addEdge('processResponse', END);

  return translateRuleGraph.compile();
}
