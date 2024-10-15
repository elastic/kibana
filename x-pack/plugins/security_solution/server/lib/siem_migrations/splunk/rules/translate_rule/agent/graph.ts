/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
// import { StringOutputParser } from '@langchain/core/output_parsers';
import type { AIMessage } from '@langchain/core/messages';
import { translateRuleState } from './state';
import type {
  TranslateRuleGraphParams,
  TranslateRuleNodeParams,
  TranslateRuleState,
} from './types';
import { TRANSLATE_RULE_MAIN_PROMPT } from './prompts';

const callModel = async ({
  state,
  model,
}: TranslateRuleNodeParams): Promise<Partial<TranslateRuleState>> => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

// Define the function that determines whether to continue or not
// We can extract the state typing via `StateAnnotation.State`
function toolConditionalEdge(state: TranslateRuleState) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  // If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage.tool_calls?.length) {
    return 'tools';
  }
  return END;
}

export function getTranslateRuleGraph({ model, tools }: TranslateRuleGraphParams) {
  if (model.bindTools === undefined) {
    throw new Error(`The ${model.name} model does not support tools`);
  }
  model.bindTools(tools);

  const translateRuleGraph = new StateGraph(translateRuleState)
    .addNode('callModel', (state: TranslateRuleState) => callModel({ state, model }))
    .addNode('tools', new ToolNode<TranslateRuleState>(tools))
    .addEdge(START, 'callModel')
    .addConditionalEdges('callModel', toolConditionalEdge)
    .addEdge('tools', 'callModel');

  const graph = translateRuleGraph.compile();

  const invoke: typeof graph.invoke = async (state, options) => {
    const mainPrompts = await TRANSLATE_RULE_MAIN_PROMPT.formatMessages({
      splunkRuleTitle: state.splunkRuleTitle,
      splunkRuleDescription: state.splunkRuleDescription,
      splunkRuleQuery: state.splunkRuleQuery,
    });

    return graph.invoke({ ...state, messages: mainPrompts }, options);
  };

  return { invoke };
}
