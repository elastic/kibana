/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { Logger } from '@kbn/core/server';
import { ToolsProvider } from '../../mcp_gateway';
import { createSearchAgentGraph } from './search_agent_graph';
import type { SearchAgentOutput } from './types';
import { graphNames } from '../../constants';

export const getSearchAgentCaller =
  (deps: { toolsProvider: ToolsProvider; chatModel: InferenceChatModel; logger: Logger }) =>
  ({ query, context }: { query: string; context?: string }) => {
    return runSearchAgent({ query, context, ...deps });
  };

export const runSearchAgent = async ({
  query,
  context,
  toolsProvider,
  chatModel,
  logger,
}: {
  query: string;
  context?: string;
  toolsProvider: ToolsProvider;
  chatModel: InferenceChatModel;
  logger: Logger;
}): Promise<SearchAgentOutput> => {
  const searchAgentGraph = await createSearchAgentGraph({
    chatModel,
    toolsProvider,
    logger,
  });

  const finalState = await searchAgentGraph
    .withConfig({
      tags: [`agent:search_agent`],
    })
    .invoke(
      { searchQuery: query, searchContext: context },
      {
        recursionLimit: 20,
        runName: 'searchAgentGraph',
        metadata: {
          graphName: graphNames.searchAgent,
        },
      }
    );

  const { summary, citations } = finalState;

  return { summary, citations };
};
