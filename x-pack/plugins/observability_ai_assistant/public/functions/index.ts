/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import type { CoreStart } from '@kbn/core/public';
import type { RegisterContextDefinition, RegisterFunctionDefinition } from '../../common/types';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../types';
import type { ObservabilityAIAssistantService } from '../types';
import { registerElasticsearchFunction } from './elasticsearch';
import { registerKibanaFunction } from './kibana';
import { registerLensFunction } from './lens';
import { registerRecallFunction } from './recall';
import { registerSummarisationFunction } from './summarise';

export async function registerFunctions({
  registerFunction,
  registerContext,
  service,
  pluginsStart,
  coreStart,
  signal,
}: {
  registerFunction: RegisterFunctionDefinition;
  registerContext: RegisterContextDefinition;
  service: ObservabilityAIAssistantService;
  pluginsStart: ObservabilityAIAssistantPluginStartDependencies;
  coreStart: CoreStart;
  signal: AbortSignal;
}) {
  return service
    .callApi('GET /internal/observability_ai_assistant/functions/kb_status', {
      signal,
    })
    .then((response) => {
      const isReady = response.ready;

      let description = `You have the ability to call Elasticsearch APIs with the "elasticsearch" function or create visualisations using Lens with the "lens" function in the context of this chat. Use the Elasticsearch function only when requested by the user.`;

      if (isReady) {
        description += `You can use the "summarise" functions to store new information you have learned in a knowledge database. Once you have established that you did not know the answer to a question, and the user gave you this information, it's important that you create a summarisation of what you have learned and store it in the knowledge database. When you create this summarisation, make sure you craft it in a way that can be recalled with a semantic search later.

        Additionally, you can use the "recall" function to retrieve relevant information from the knowledge database. Using the "recall" function will allow you to create a much more tailored and improved user experience. Assume the user has told you before.
      
        For every question that the user asks, you, as the assistant, must query the knowledge base, no matter how confident you are in your response.
      
        When the user starts a conversation, you as the assistant, MUST ALWAYS use the "recall" function to make sure you have enough context from the knowledge database to understand their question. DO NOT assume your knowledge is sufficient to answer the question appropriately. Make sure you mention this to the user in your first reply to them.
      
        You do have access to private data that the user has shared with you in previous conversations.
      
        Given this ability to store and recall data, it is very important to not make assumptions about the user's data or preferences, but rather, first query the knowledge database, and if nothing relevant comes up, ask the user for clarification. This is very important! They could be storing their data in any field, and in any data stream or index.
      
        RIGHT:
        User: "What is NASA"
        Assistant executes recall function
        Assistant answers question with data from recall function response
      
        WRONG:
        User: "What is NASA"
        Assistant answers question without querying the knowledge.
        
        BEFORE you use a function, always query the knowledge database for more information about that function. This is important.
        
        Avoid making too many assumptions about user's data. If clarification is needed, query the knowledge base for previous learnings. If you don't find anything, ask the user for clarification, and when successful, store this into the knowledge base. 
        `;
        registerSummarisationFunction({ service, registerFunction });
        registerRecallFunction({ service, registerFunction });
        registerLensFunction({ service, pluginsStart, registerFunction });
      } else {
        description += `You do not have a working memory. Don't try to recall information via the "recall" function.  If the user expects you to remember the previous conversations, tell them they can set up the knowledge base. A banner is available at the top of the conversation to set this up.`;
      }

      registerElasticsearchFunction({ service, registerFunction });
      registerKibanaFunction({ service, registerFunction, coreStart });

      registerContext({
        name: 'core',
        description: dedent(description),
      });
    });
}
