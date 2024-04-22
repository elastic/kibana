/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromptTemplate } from '@langchain/core/prompts';
import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { LLMChain } from 'langchain/chains';
import { OutputFixingParser } from 'langchain/output_parsers';
import { DynamicTool } from '@langchain/core/tools';

import { APP_UI_ID } from '../../../../common';
import { getAnonymizedAlerts } from './get_anonymized_alerts';
import { getOutputParser } from './get_output_parser';
import { sizeIsOutOfRange } from '../open_and_acknowledged_alerts/helpers';
import { getInsightsPrompt } from './get_insights_prompt';

export interface InsightsToolParams extends AssistantToolParams {
  alertsIndexPattern: string;
  size: number;
}

export const INSIGHTS_TOOL_DESCRIPTION =
  'Call this for insights containing `markdown` that should be displayed verbatim (with no additional processing).';

/**
 * Returns a tool for insights from open and acknowledged alerts, or null if
 * the request doesn't have all the required parameters.
 */
export const INSIGHTS_TOOL: AssistantTool = {
  id: 'insights-tool',
  name: 'InsightsTool',
  description: INSIGHTS_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is InsightsToolParams => {
    const { alertsIndexPattern, llm, request, size } = params;
    return (
      requestHasRequiredAnonymizationParams(request) &&
      alertsIndexPattern != null &&
      size != null &&
      !sizeIsOutOfRange(size) &&
      llm != null
    );
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const {
      alertsIndexPattern,
      anonymizationFields,
      esClient,
      llm,
      onNewReplacements,
      replacements,
      size,
    } = params as InsightsToolParams;

    return new DynamicTool({
      name: 'InsightsTool',
      description: INSIGHTS_TOOL_DESCRIPTION,
      func: async () => {
        if (llm == null) {
          throw new Error('LLM is required for insights');
        }

        const anonymizedAlerts = await getAnonymizedAlerts({
          alertsIndexPattern,
          anonymizationFields,
          esClient,
          onNewReplacements,
          replacements,
          size,
        });

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
          query: getInsightsPrompt({ anonymizedAlerts }),
        });

        return JSON.stringify(result.records, null, 2);
      },
      tags: ['insights'],
    });
  },
};
