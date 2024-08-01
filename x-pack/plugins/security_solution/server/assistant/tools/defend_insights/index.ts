/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { DefendInsightsPostRequestBody } from '@kbn/elastic-assistant-common';

import { LLMChain } from 'langchain/chains';
import { OutputFixingParser } from 'langchain/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { DynamicTool } from '@langchain/core/tools';
import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';

import { APP_UI_ID } from '../../../../common';
import { getAnonymizedEvents } from './get_anonymized_events';
import { getOutputParser } from './get_output_parser';
import { getDefendInsightsPrompt } from './prompts';

export const DEFEND_INSIGHTS_TOOL_DESCRIPTION = 'Call this for Elastic Defend insights.';

/**
 * Returns a tool for generating Elastic Defend configuration insights
 */
export const DEFEND_INSIGHTS_TOOL: AssistantTool = {
  id: 'defend-insights',
  name: 'defendInsightsTool',
  description: DEFEND_INSIGHTS_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams) => {
    const { llm, request } = params;

    return requestHasRequiredAnonymizationParams(request) && llm != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const {
      anonymizationFields,
      esClient,
      langChainTimeout,
      llm,
      onNewReplacements,
      replacements,
    } = params;
    const requestBody = params.request.body as DefendInsightsPostRequestBody;

    return new DynamicTool({
      name: 'DefendInsightsTool',
      description: DEFEND_INSIGHTS_TOOL_DESCRIPTION,
      func: async () => {
        if (llm == null) {
          throw new Error('LLM is required for Defend Insights');
        }

        const anonymizedEvents = await getAnonymizedEvents({
          endpointIds: requestBody.endpointIds,
          type: requestBody.insightType,
          anonymizationFields,
          esClient,
          onNewReplacements,
          replacements,
        });

        const eventsContextCount = anonymizedEvents.length;
        if (eventsContextCount === 0) {
          return JSON.stringify({ eventsContextCount, insights: [] }, null, 2);
        }

        const outputParser = getOutputParser();
        const outputFixingParser = OutputFixingParser.fromLLM(llm, outputParser);

        const prompt = new PromptTemplate({
          template: `Answer the user's question as best you can:\n{format_instructions}\n{query}`,
          inputVariables: ['query'],
          partialVariables: {
            format_instructions: outputFixingParser.getFormatInstructions(),
          },
        });

        const answerFormattingChain = new LLMChain({
          llm,
          prompt,
          outputKey: 'records',
          outputParser: outputFixingParser,
        });

        const result = await answerFormattingChain.call({
          query: getDefendInsightsPrompt({
            type: requestBody.insightType,
            anonymizedValues: anonymizedEvents,
          }),
          timeout: langChainTimeout,
        });
        const insights = result.records;

        return JSON.stringify({ eventsContextCount, insights }, null, 2);
      },
      tags: ['defend-insights'],
    });
  },
};
