/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { Logger } from '@kbn/core/server';
import { ToolsProvider } from '../../mcp_gateway';
import { getSearchAgentCaller } from './run_search_agent';

export const createSearchAgentTool = ({
  toolsProvider,
  chatModel,
  logger,
}: {
  toolsProvider: ToolsProvider;
  chatModel: InferenceChatModel;
  logger: Logger;
}) => {
  const runSearchAgent = getSearchAgentCaller({
    chatModel,
    toolsProvider,
    logger,
  });

  return new DynamicStructuredTool({
    name: 'search',
    description: `
    Use this tool to search for knowledge.

    The tool accepts a natural language query as input, and will delegates the search to an specialized AI agent.

    You can use the 'context' parameter to add additional context that could be useful for the search agent. It can be
    useful for example to add a quick summary of what was previously searched, or a summary of the parts of the conversation
    that could be useful to know for the agent to perform the search task.

    The output of the tool will be the documents, or content, that the search agent retrieved, and a summary of
    the documents in context of the 'query' and 'context' provided as input.

    Examples:

    - If the user asks "Can you find the github issues currently assigned to me",
      You can search for "find github issues currently assigned to the user"
    - If the user asks for "Hello. What is the organization's policy about remote work",
      You can search for "remote work policy in the organization"
    `,
    metadata: {},
    schema: z.object({
      query: z.string().describe(`The natural language query to search for`),
      context: z
        .string()
        .optional()
        .describe(`Optional additional context that could be useful for the search agent`),
    }),
    responseFormat: 'content_and_artifact',
    func: async ({ query, context }) => {
      const result = await runSearchAgent({ query, context });
      return [result, result];
    },
  });
};
