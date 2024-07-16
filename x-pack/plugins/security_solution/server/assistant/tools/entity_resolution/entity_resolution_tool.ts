/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromptTemplate } from '@langchain/core/prompts';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { LLMChain } from 'langchain/chains';
import { OutputFixingParser } from 'langchain/output_parsers';
import { DynamicTool } from '@langchain/core/tools';

import { APP_UI_ID } from '../../../../common';
import { getCandidateEntities } from './get_candidate_entities';
import { getEntityResolutionOutputParser } from './get_entity_resolution_output_parser';
import { sizeIsOutOfRange } from '../open_and_acknowledged_alerts/helpers';
import { getEntityResolutionPrompt } from './get_entity_resolution_prompt';

export interface EntityResolutionToolParams extends AssistantToolParams {
  entitiesIndexPattern: string;
  size: number;
}

export const ENTITY_RESOLUTION_TOOL_DESCRIPTION =
  'Call this tool to find matching entities in the entity store for the given search entity.';

/**
 * Returns a tool that resolves entities for a given search entity.
 */
export const ENTITY_RESOLUTION_TOOL: AssistantTool = {
  id: 'entity-resolution',
  name: 'EntityResolutionTool',
  description: ENTITY_RESOLUTION_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is EntityResolutionToolParams => {
    const { entitiesIndexPattern, llm, size } = params;

    return entitiesIndexPattern != null && size != null && !sizeIsOutOfRange(size) && llm != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { entitiesIndexPattern, searchEntity, esClient, langChainTimeout, llm, size, logger } =
      params as EntityResolutionToolParams;

    return new DynamicTool({
      name: 'EntityResolutionTool',
      description: ENTITY_RESOLUTION_TOOL_DESCRIPTION,
      func: async () => {
        if (llm == null) {
          throw new Error('LLM is required for attack discoveries');
        }

        if (!searchEntity) {
          throw new Error('Search entity is required for entity resolution');
        }

        const candidateEntities = await getCandidateEntities({
          searchEntity,
          namespace: 'default', // TODO: get namespace from request
          entitiesIndexPattern,
          esClient,
          size,
          logger,
        });

        const outputParser = getEntityResolutionOutputParser();
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
          outputKey: 'matches',
          outputParser: outputFixingParser,
        });

        const { matches } = await answerFormattingChain.call({
          query: getEntityResolutionPrompt({ searchEntity, candidateEntities }),
          timeout: langChainTimeout,
        });

        return JSON.stringify({ matches }, null, 2);
      },
      tags: ['entity-analytics', 'entity-resolution'],
    });
  },
};
