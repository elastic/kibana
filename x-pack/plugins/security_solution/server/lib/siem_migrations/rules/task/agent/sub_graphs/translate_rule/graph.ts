/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { getProcessQueryNode } from './nodes/process_query';
import { getRetrieveIntegrationsNode } from './nodes/retrieve_integrations';
import { getTranslateRuleNode } from './nodes/translate_rule';
import { translateRuleState } from './state';
import type { TranslateRuleGraphParams } from './types';

export function getTranslateRuleGraph({
  model,
  inferenceClient,
  resourceRetriever,
  integrationRetriever,
  connectorId,
  logger,
}: TranslateRuleGraphParams) {
  const translateRuleNode = getTranslateRuleNode({
    model,
    inferenceClient,
    resourceRetriever,
    connectorId,
    logger,
  });
  const processQueryNode = getProcessQueryNode({
    model,
    resourceRetriever,
    logger,
  });
  const retrieveIntegrationsNode = getRetrieveIntegrationsNode({
    model,
    integrationRetriever,
  });

  const translateRuleGraph = new StateGraph(translateRuleState)
    // Nodes
    .addNode('processQuery', processQueryNode)
    .addNode('retrieveIntegrations', retrieveIntegrationsNode)
    .addNode('translateRule', translateRuleNode)
    // Edges
    .addEdge(START, 'processQuery')
    .addEdge('processQuery', 'retrieveIntegrations')
    .addEdge('retrieveIntegrations', 'translateRule')
    .addEdge('translateRule', END);

  const graph = translateRuleGraph.compile();
  graph.name = 'Translate Rule Graph';
  return graph;
}
