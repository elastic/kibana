/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromptTemplate } from '@langchain/core/prompts';
import { DynamicTool } from '@langchain/core/tools';
import { LLMChain } from 'langchain/chains';
import { OutputFixingParser } from 'langchain/output_parsers';

import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { DefendInsightType } from '@kbn/elastic-assistant-common';

import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';
import { DEFEND_INSIGHTS_TOOL_ID } from '@kbn/elastic-assistant-common';

import { APP_UI_ID } from '../../../../common';
import { getAnonymizedEvents } from './get_events';
import { getDefendInsightsOutputParser } from './output_parsers';
import { getDefendInsightsPrompt } from './prompts';

export const DEFEND_INSIGHTS_TOOL_DESCRIPTION = 'Call this for Elastic Defend insights.';

export interface DefendInsightsToolParams extends AssistantToolParams {
  endpointIds: string[];
  insightType: DefendInsightType;
}

/**
 * Returns a tool for generating Elastic Defend configuration insights
 */
export const DEFEND_INSIGHTS_TOOL: AssistantTool = Object.freeze({
  id: DEFEND_INSIGHTS_TOOL_ID,
  name: 'defendInsightsTool',
  description: DEFEND_INSIGHTS_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,

  isSupported: (params: AssistantToolParams): boolean => {
    const { llm, request } = params;

    return requestHasRequiredAnonymizationParams(request) && llm != null;
  },

  getTool(params: AssistantToolParams): DynamicTool | null {
    if (!this.isSupported(params)) return null;

    const {
      endpointIds,
      insightType,
      anonymizationFields,
      esClient,
      langChainTimeout,
      llm,
      onNewReplacements,
      replacements,
    } = params as DefendInsightsToolParams;

    return new DynamicTool({
      name: 'DefendInsightsTool',
      description: DEFEND_INSIGHTS_TOOL_DESCRIPTION,
      func: async () => {
        if (llm == null) {
          throw new Error('LLM is required for Defend Insights');
        }

        const anonymizedEvents = await getAnonymizedEvents({
          endpointIds,
          type: insightType,
          anonymizationFields,
          esClient,
          onNewReplacements,
          replacements,
        });

        const eventsContextCount = anonymizedEvents.length;
        if (eventsContextCount === 0) {
          return JSON.stringify({ eventsContextCount, insights: [] }, null, 2);
        }

        const outputParser = getDefendInsightsOutputParser({ type: insightType });
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
            type: insightType,
            events: anonymizedEvents,
          }),
          timeout: langChainTimeout,
        });
        const insights = result.records;

        return JSON.stringify({ eventsContextCount, insights }, null, 2);
      },
      tags: [DEFEND_INSIGHTS_TOOL_ID],
    });
  },
});
