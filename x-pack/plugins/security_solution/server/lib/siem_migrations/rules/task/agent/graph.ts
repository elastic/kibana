/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { migrateRuleState } from './state';
import type { MigrateRuleGraphParams, MigrateRuleState } from './types';
import { getTranslateQueryNode } from './nodes/translate_query';
import { getMatchPrebuiltRuleNode } from './nodes/match_prebuilt_rule';

export function getRuleMigrationAgent({
  model,
  inferenceClient,
  prebuiltRulesMap,
  resourceRetriever,
  connectorId,
  logger,
}: MigrateRuleGraphParams) {
  const matchPrebuiltRuleNode = getMatchPrebuiltRuleNode({ model, prebuiltRulesMap, logger });
  const translationNode = getTranslateQueryNode({
    model,
    inferenceClient,
    resourceRetriever,
    connectorId,
    logger,
  });

  const translateRuleGraph = new StateGraph(migrateRuleState)
    // Nodes
    .addNode('matchPrebuiltRule', matchPrebuiltRuleNode)
    .addNode('translation', translationNode)
    // Edges
    .addEdge(START, 'matchPrebuiltRule')
    .addConditionalEdges('matchPrebuiltRule', matchedPrebuiltRuleConditional)
    .addEdge('translation', END);

  const graph = translateRuleGraph.compile();
  graph.name = 'Rule Migration Graph'; // Customizes the name displayed in LangSmith
  return graph;
}

const matchedPrebuiltRuleConditional = (state: MigrateRuleState) => {
  if (state.elastic_rule?.prebuilt_rule_id) {
    return END;
  }
  return 'translation';
};
