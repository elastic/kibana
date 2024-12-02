/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { isEmpty } from 'lodash/fp';
import { SiemMigrationRuleTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import { getFixQueryErrorsNode } from './nodes/fix_query_errors';
import { getProcessQueryNode } from './nodes/process_query';
import { getRetrieveIntegrationsNode } from './nodes/retrieve_integrations';
import { getTranslateRuleNode } from './nodes/translate_rule';
import { getValidationNode } from './nodes/validation';
import { translateRuleState } from './state';
import type { TranslateRuleGraphParams, TranslateRuleState } from './types';

// How many times we will try to self-heal when validation fails, to prevent infinite graph recursions
const MAX_VALIDATION_ITERATIONS = 3;

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
  const validationNode = getValidationNode({ logger });
  const fixQueryErrorsNode = getFixQueryErrorsNode({ inferenceClient, connectorId, logger });

  const translateRuleGraph = new StateGraph(translateRuleState)
    // Nodes
    .addNode('processQuery', processQueryNode)
    .addNode('retrieveIntegrations', retrieveIntegrationsNode)
    .addNode('translateRule', translateRuleNode)
    .addNode('validation', validationNode)
    .addNode('fixQueryErrors', fixQueryErrorsNode)
    // Edges
    .addEdge(START, 'processQuery')
    .addEdge('processQuery', 'retrieveIntegrations')
    .addEdge('retrieveIntegrations', 'translateRule')
    .addEdge('translateRule', 'validation')
    .addEdge('fixQueryErrors', 'validation')
    .addConditionalEdges('validation', validationRouter);

  const graph = translateRuleGraph.compile();
  graph.name = 'Translate Rule Graph';
  return graph;
}

const validationRouter = (state: TranslateRuleState) => {
  if (
    state.validation_errors.iterations <= MAX_VALIDATION_ITERATIONS &&
    state.translation_result === SiemMigrationRuleTranslationResult.FULL
  ) {
    if (!isEmpty(state.validation_errors?.esql_errors)) {
      return 'fixQueryErrors';
    }
  }
  return END;
};
