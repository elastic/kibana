/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
// import { StringOutputParser } from '@langchain/core/output_parsers';
import { translateRuleState } from './state';
import type {
  TranslateRuleGraphParams,
  TranslateRuleNodeParams,
  TranslateRuleState,
} from './types';

const callModel = async ({
  state,
  model,
}: TranslateRuleNodeParams): Promise<Partial<TranslateRuleState>> => {
  // TODO:
  return state;
};

export async function getTranslateRuleGraph({ model }: TranslateRuleGraphParams) {
  const matchPrebuiltRuleGraph = new StateGraph(translateRuleState)
    .addNode('callModel', (state: TranslateRuleState) => callModel({ state, model }))
    .addEdge(START, 'callModel')
    .addEdge('callModel', END);

  return matchPrebuiltRuleGraph.compile();
}
