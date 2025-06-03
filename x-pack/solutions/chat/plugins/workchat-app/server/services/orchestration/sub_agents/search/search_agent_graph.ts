/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { StateGraph, Annotation } from '@langchain/langgraph';
import { BaseMessage, AIMessage } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { InferenceChatModel } from '@kbn/inference-langchain';
import { ContentRef } from '@kbn/wci-common';
import { ToolContentResult } from '@kbn/wci-server';
import type { Logger } from '@kbn/core/server';
import { ToolsProvider } from '../../mcp_gateway';
import { processSearchResults, parseRatings, Rating, processRatings } from './utils/tool_messages';
import {
  getPlanningPrompt,
  getRetrievalPrompt,
  getAnalysisPrompt,
  getSummarizerPrompt,
} from './prompts';
import { stepDoneTool, stepDoneToolName } from './workflow_tools';

export const createSearchAgentGraph = async ({
  chatModel,
  toolsProvider,
  logger,
}: {
  chatModel: InferenceChatModel;
  toolsProvider: ToolsProvider;
  logger: Logger;
}) => {
  const StateAnnotation = Annotation.Root({
    // input
    searchQuery: Annotation<string>,
    searchContext: Annotation<string>,
    // internal state
    planning: Annotation<string>,
    retrievalMessages: Annotation<BaseMessage[]>({
      reducer: messagesStateReducer,
      default: () => [],
    }),
    ratings: Annotation<Rating[]>,
    parsedResults: Annotation<ToolContentResult[]>,
    filteredResults: Annotation<ToolContentResult[]>,
    // output
    citations: Annotation<ContentRef[]>,
    summary: Annotation<string>,
  });

  const searchTools = await toolsProvider.getSearchTools();
  const retrievalTools = [...searchTools, stepDoneTool()];

  // step one - create retrieval plan

  const planningModel = chatModel.bindTools(retrievalTools).withConfig({
    tags: [`agent:search_agent`, `step:planning`],
  });

  const createPlanning = async (state: typeof StateAnnotation.State) => {
    logger.debug('Creating a plan');
    const response = await planningModel.invoke(getPlanningPrompt({ query: state.searchQuery }));
    return {
      planning: response.content,
    };
  };

  // step two - apply the plan by executing tool calls

  const retrievalToolNode = new ToolNode<BaseMessage[]>(retrievalTools);

  const retrievalModel = chatModel.bindTools(retrievalTools).withConfig({
    tags: [`agent:search_agent`, `step:retrieval`],
  });

  const agenticRetrieval = async (state: typeof StateAnnotation.State) => {
    logger.debug(`Running retrieval with plan: ${state.planning}`);
    const response = await retrievalModel.invoke(
      getRetrievalPrompt({ plan: state.planning, messages: state.retrievalMessages })
    );
    return {
      retrievalMessages: [response],
    };
  };

  const handleRetrievalTransition = async (state: typeof StateAnnotation.State) => {
    const messages = state.retrievalMessages;
    const lastMessage: AIMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.tool_calls?.length) {
      const toolNames = lastMessage.tool_calls.map((call) => call.name);
      if (toolNames.length === 1 && toolNames[0] === stepDoneToolName) {
        logger.debug('Transitioning to process results');
        return 'process_results';
      } else {
        logger.debug('Transitioning to call retrieval tools');
        return 'call_retrieval_tools';
      }
    }
    // should not happen, LLM is supposed to always call tools at each round, but we never know
    return 'process_results';
  };

  const retrievalToolHandler = async (state: typeof StateAnnotation.State) => {
    logger.debug('Handling retrieval outputs');
    const toolNodeResult = await retrievalToolNode.invoke(state.retrievalMessages);
    return {
      retrievalMessages: [...toolNodeResult],
    };
  };

  // step 3: rate documents

  const processResults = async (state: typeof StateAnnotation.State) => {
    logger.debug('Processing results');
    const toolResults = processSearchResults(state.retrievalMessages);
    return {
      parsedResults: toolResults.results,
    };
  };

  const analysisModel = chatModel
    .withStructuredOutput(
      z.object({
        ratings: z
          .array(z.string())
          .describe('the ratings, one per document using the "{id}|{grade}" format.'),
        comment: z.string().optional().describe('optional comments or remarks on the ratings'),
      })
    )
    .withConfig({
      tags: [`agent:search_agent`, `step:analysis`],
    });

  const rateResults = async (state: typeof StateAnnotation.State) => {
    logger.debug(`Rating ${state.parsedResults.length} results`);
    const results = state.parsedResults;
    const query = state.searchQuery;

    const response = await analysisModel.invoke(getAnalysisPrompt({ query, results }));
    const ratings = parseRatings(response.ratings);

    const filteredResults = processRatings({
      results,
      ratings,
      maxResults: 5,
      minScore: 5,
    });

    const citations = filteredResults.map((result) => result.reference);

    return {
      ratings,
      filteredResults,
      citations,
    };
  };

  // step 4: create summary

  const summarizerModel = chatModel.bindTools(retrievalTools).withConfig({
    tags: [`agent:search_agent`, `step:summary`],
  });

  const generateSummary = async (state: typeof StateAnnotation.State) => {
    logger.debug(`Generating a summary for ${state.searchQuery}`);
    const response = await summarizerModel.invoke(
      getSummarizerPrompt({
        query: state.searchQuery,
        context: state.searchContext,
        results: state.filteredResults,
      })
    );
    return {
      summary: response.content,
    };
  };

  // step 5: end

  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode('create_planning', createPlanning)
    .addNode('retrieve_agent', agenticRetrieval)
    .addNode('call_retrieval_tools', retrievalToolHandler)
    .addNode('process_results', processResults)
    .addNode('rate_results', rateResults)
    .addNode('generate_summary', generateSummary)
    // edges
    .addEdge('__start__', 'create_planning')
    .addEdge('create_planning', 'retrieve_agent')
    .addConditionalEdges('retrieve_agent', handleRetrievalTransition, {
      call_retrieval_tools: 'call_retrieval_tools',
      process_results: 'process_results',
    })
    .addEdge('call_retrieval_tools', 'retrieve_agent')
    .addEdge('process_results', 'rate_results')
    .addEdge('rate_results', 'generate_summary')
    .addEdge('generate_summary', '__end__')
    // end
    .compile();

  return graph;
};
