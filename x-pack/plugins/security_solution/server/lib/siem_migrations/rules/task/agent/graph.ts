/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { getMatchPrebuiltRuleNode } from './nodes/match_prebuilt_rule';
import { migrateRuleState } from './state';
import { getTranslateRuleGraph } from './sub_graphs/translate_rule';
import type { MigrateRuleGraphParams, MigrateRuleState } from './types';

export function getRuleMigrationAgent({
  model,
  inferenceClient,
  prebuiltRulesMap,
  resourceRetriever,
  integrationRetriever,
  connectorId,
  logger,
}: MigrateRuleGraphParams) {
  const matchPrebuiltRuleNode = getMatchPrebuiltRuleNode({ model, prebuiltRulesMap });
  const translationSubGraph = getTranslateRuleGraph({
    model,
    inferenceClient,
    resourceRetriever,
    integrationRetriever,
    connectorId,
    logger,
  });

  const siemMigrationAgentGraph = new StateGraph(migrateRuleState)
    // Nodes
    .addNode('matchPrebuiltRule', matchPrebuiltRuleNode)
    .addNode('translationSubGraph', translationSubGraph)
    // Edges
    .addEdge(START, 'matchPrebuiltRule')
    .addConditionalEdges(
      'matchPrebuiltRule',
      (state: MigrateRuleState) => matchedPrebuiltRuleConditional(state),
      { translate: 'translationSubGraph', end: END }
    )
    .addEdge('translationSubGraph', END);

  const graph = siemMigrationAgentGraph.compile();
  graph.name = 'Rule Migration Graph'; // Customizes the name displayed in LangSmith
  return graph;
}

const matchedPrebuiltRuleConditional = (state: MigrateRuleState) => {
  if (state.elastic_rule?.prebuilt_rule_id) {
    return 'end';
  }
  return 'translate';
};
