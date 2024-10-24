/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { matchPrebuiltRuleState } from './state';
import type {
  MatchPrebuiltRuleGraphParams,
  MatchPrebuiltRuleNodeParams,
  MatchPrebuiltRuleState,
} from './types';
import { MATCH_PREBUILT_RULE_PROMPT } from './prompts';

const callModel = async ({
  state,
  model,
}: MatchPrebuiltRuleNodeParams): Promise<Partial<MatchPrebuiltRuleState>> => {
  const outputParser = new StringOutputParser();
  const matchPrebuiltRule = MATCH_PREBUILT_RULE_PROMPT.pipe(model).pipe(outputParser);

  const elasticSecurityRules = Array(state.prebuiltRulesMap.keys()).join('\n');
  const response = await matchPrebuiltRule.invoke({
    elasticSecurityRules,
    splunkRuleTitle: state.splunkRuleTitle,
    splunkRuleDescription: state.splunkRuleDescription,
  });
  return { response };
};

const processResponse = (state: MatchPrebuiltRuleState): Partial<MatchPrebuiltRuleState> => {
  const cleanResponse = state.response.trim();
  if (cleanResponse === 'no_match') {
    return { matched: false };
  }
  const result = state.prebuiltRulesMap.get(cleanResponse);
  if (result != null) {
    return { matched: true, result };
  }
  return { matched: false };
};

export async function getMatchPrebuiltRuleGraph({ model }: MatchPrebuiltRuleGraphParams) {
  const matchPrebuiltRuleGraph = new StateGraph(matchPrebuiltRuleState)
    .addNode('callModel', (state: MatchPrebuiltRuleState) => callModel({ state, model }))
    .addNode('processResponse', processResponse)
    .addEdge(START, 'callModel')
    .addEdge('callModel', 'processResponse')
    .addEdge('processResponse', END);

  return matchPrebuiltRuleGraph.compile();
}
