/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { getCreateSemanticQueryNode } from './nodes/create_semantic_query';
import { getMatchPrebuiltRuleNode } from './nodes/match_prebuilt_rule';
import { getProcessQueryNode } from './nodes/process_query';

import { migrateRuleState } from './state';
import { getTranslateRuleGraph } from './sub_graphs/translate_rule';
import type { MigrateRuleGraphParams, MigrateRuleState } from './types';

export function getRuleMigrationAgent({
  model,
  inferenceClient,
  ruleMigrationsRetriever,
  connectorId,
  logger,
}: MigrateRuleGraphParams) {
  const matchPrebuiltRuleNode = getMatchPrebuiltRuleNode({
    model,
    ruleMigrationsRetriever,
  });
  const translationSubGraph = getTranslateRuleGraph({
    inferenceClient,
    ruleMigrationsRetriever,
    connectorId,
    logger,
  });
  const createSemanticQueryNode = getCreateSemanticQueryNode({ model });
  const processQueryNode = getProcessQueryNode({ model, ruleMigrationsRetriever });

  const siemMigrationAgentGraph = new StateGraph(migrateRuleState)
    // Nodes
    .addNode('processQuery', processQueryNode)
    .addNode('createSemanticQuery', createSemanticQueryNode)
    .addNode('matchPrebuiltRule', matchPrebuiltRuleNode)
    .addNode('translationSubGraph', translationSubGraph)
    // Edges
    .addEdge(START, 'processQuery')
    .addEdge('processQuery', 'createSemanticQuery')
    .addEdge('createSemanticQuery', 'matchPrebuiltRule')
    .addConditionalEdges('matchPrebuiltRule', matchedPrebuiltRuleConditional, {
      [END]: END,
      translationSubGraph: 'translationSubGraph',
    })
    .addEdge('translationSubGraph', END);

  const graph = siemMigrationAgentGraph.compile();
  graph.name = 'Rule Migration Graph'; // Customizes the name displayed in LangSmith
  return graph;
}

const matchedPrebuiltRuleConditional = (state: MigrateRuleState) => {
  if (state.elastic_rule?.prebuilt_rule_id) {
    return END;
  }
  return 'translationSubGraph';
};
