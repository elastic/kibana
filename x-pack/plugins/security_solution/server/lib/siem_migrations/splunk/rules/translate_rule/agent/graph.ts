/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
// import { StringOutputParser } from '@langchain/core/output_parsers';
import { AIMessage } from '@langchain/core/messages';
import type { Runnable } from '@langchain/core/runnables';
import { translateRuleState } from './state';
import type { TranslateRuleGraphParams, TranslateRuleState } from './types';
import { TRANSLATE_RULE_MAIN_PROMPT, getEsqlTranslationPrompt } from './prompts';
import { getEsqlKnowledgeBase, type EsqlKnowledgeBaseCaller } from './esql_knowledge_base_caller';

type GraphNode = (state: TranslateRuleState) => Promise<Partial<TranslateRuleState>>;

const initMessages: GraphNode = async (state: TranslateRuleState) => {
  return {
    messages: await TRANSLATE_RULE_MAIN_PROMPT.formatMessages({
      splunkRuleTitle: state.splunkRuleTitle,
      splunkRuleDescription: state.splunkRuleDescription,
      splunkRuleQuery: state.splunkRuleQuery,
    }),
  };
};

const createCallModelNode =
  (model: Runnable): GraphNode =>
  async (state) => {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  };

const createTranslationNode = (esqlKnowledgeBaseCaller: EsqlKnowledgeBaseCaller): GraphNode => {
  return async (state) => {
    const input = getEsqlTranslationPrompt({
      splunkRuleTitle: state.splunkRuleTitle,
      splunkRuleDescription: state.splunkRuleDescription,
      splunkRuleQuery: state.splunkRuleQuery,
    });
    const response = await esqlKnowledgeBaseCaller(input);
    return { messages: [new AIMessage(response)] };
  };
};

const responseNode: GraphNode = async (state) => {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  return { response: lastMessage.content as string };
};

function toolConditionalEdge(state: TranslateRuleState) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  if (lastMessage.tool_calls?.length) {
    return 'tools';
  }
  return 'processResponse';
}

// export function getTranslateRuleGraph({ model, tools }: TranslateRuleGraphParams) {
//   if (model.bindTools === undefined) {
//     throw new Error(`The ${model.name} model does not support tools`);
//   }
//   const modelWithTools: Runnable = model.bindTools(tools);
//   const callModel = createCallModelNode(modelWithTools);
//   const toolsNode = new ToolNode<TranslateRuleState>(tools);

//   const translateRuleGraph = new StateGraph(translateRuleState)
//     .addNode('initMessages', initMessages)
//     .addNode('callModel', callModel)
//     .addNode('tools', toolsNode)
//     .addNode('processResponse', responseNode)

//     .addEdge(START, 'initMessages')
//     .addEdge('initMessages', 'callModel')
//     .addConditionalEdges('callModel', toolConditionalEdge)
//     .addEdge('tools', 'callModel')
//     .addEdge('processResponse', END);

//   return translateRuleGraph.compile();
// }

export function getTranslateRuleGraph({
  inferenceClient,
  connectorId,
  logger,
}: TranslateRuleGraphParams) {
  const esqlKnowledgeBaseCaller = getEsqlKnowledgeBase({ inferenceClient, connectorId, logger });
  const translationNode = createTranslationNode(esqlKnowledgeBaseCaller);

  const translateRuleGraph = new StateGraph(translateRuleState)
    .addNode('translation', translationNode)
    .addNode('processResponse', responseNode)

    .addEdge(START, 'translation')
    .addEdge('translation', 'processResponse')
    .addEdge('processResponse', END);

  return translateRuleGraph.compile();
}
