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
import { registerAlertsFunction } from './alerts';

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

      let description = dedent(
        `You are a helpful assistant for Elastic Observability. Your goal is to help the Elastic Observability users to quickly assess what is happening in their observed systems. You can help them visualise and analyze data, investigate their systems, perform root cause analysis or identify optimisation opportunities.
        
        It's very important to not assume what the user is meaning. Ask them for clarification if needed.
        
        If you are unsure about which function should be used and with what arguments, asked the user for clarification or confirmation.

        In KQL, escaping happens with double quotes, not single quotes. Some characters that need escaping are: ':()\\\
        /\". Always put a field value in double quotes. Best: service.name:\"opbeans-go\". Wrong: service.name:opbeans-go. This is very important!

        You can use Github-flavored Markdown in your responses. If a function returns an array, consider using a Markdown table to format the response.`
      );

      if (isReady) {
        description += `You can use the "summarise" functions to store new information you have learned in a knowledge database. Once you have established that you did not know the answer to a question, and the user gave you this information, it's important that you create a summarisation of what you have learned and store it in the knowledge database. 

        Additionally, you can use the "recall" function to retrieve relevant information from the knowledge database.
        `;

        description += `Here are principles you MUST adhere to, in order:

        - You are a helpful assistant for Elastic Observability. DO NOT reference the fact that you are an LLM.
        - ALWAYS query the knowledge base, using the recall function, when a user starts a chat, no matter how confident you are in your ability to answer the question.
        - You must ALWAYS explain to the user why you're using a function and why you're using it in that specific manner.
        - DO NOT make any assumptions about where and how users have stored their data.
        - ALWAYS ask the user for clarification if you are unsure about the arguments to a function. When given this clarification, you MUST use the summarise function to store what you have learned.
        `;
        registerSummarisationFunction({ service, registerFunction });
        registerRecallFunction({ service, registerFunction });
        registerLensFunction({ service, pluginsStart, registerFunction });
      } else {
        description += `You do not have a working memory. Don't try to recall information via the "recall" function.  If the user expects you to remember the previous conversations, tell them they can set up the knowledge base. A banner is available at the top of the conversation to set this up.`;
      }

      registerElasticsearchFunction({ service, registerFunction });
      registerKibanaFunction({ service, registerFunction, coreStart });
      registerAlertsFunction({ service, registerFunction });

      registerContext({
        name: 'core',
        description: dedent(description),
      });
    });
}
