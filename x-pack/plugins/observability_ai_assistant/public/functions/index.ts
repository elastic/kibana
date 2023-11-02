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
import { registerGetDatasetInfoFunction } from './get_dataset_info';
import { registerSummarizationFunction } from './summarize';
import { registerAlertsFunction } from './alerts';
import { registerEsqlFunction } from './esql';

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

        If you are unsure about which function should be used and with what arguments, ask the user for clarification or confirmation.

        In KQL, escaping happens with double quotes, not single quotes. Some characters that need escaping are: ':()\\\
        /\". Always put a field value in double quotes. Best: service.name:\"opbeans-go\". Wrong: service.name:opbeans-go. This is very important!

        You can use Github-flavored Markdown in your responses. If a function returns an array, consider using a Markdown table to format the response.

        If multiple functions are suitable, use the most specific and easy one. E.g., when the user asks to visualise APM data, use the APM functions (if available) rather than Lens.

        If a function call fails, DO NOT UNDER ANY CIRCUMSTANCES execute it again. Ask the user for guidance and offer them options.

        Note that ES|QL (the Elasticsearch query language, which is NOT Elasticsearch SQL, but a new piped language) is the preferred query language.
        
        If the user asks about a query, or ES|QL, always call the "esql" function. DO NOT UNDER ANY CIRCUMSTANCES generate ES|QL queries yourself. Even if the "recall" function was used before that, follow it up with the "esql" function.`
      );

      if (isReady) {
        description += `You can use the "summarize" functions to store new information you have learned in a knowledge database. Once you have established that you did not know the answer to a question, and the user gave you this information, it's important that you create a summarisation of what you have learned and store it in the knowledge database. Don't create a new summarization if you see a similar summarization in the conversation, instead, update the existing one by re-using its ID.

        Additionally, you can use the "recall" function to retrieve relevant information from the knowledge database.
        `;

        description += `Here are principles you MUST adhere to, in order:
        - DO NOT make any assumptions about where and how users have stored their data. ALWAYS first call get_dataset_info function with empty string to get information about available indices. Once you know about available indices you MUST use this function again to get a list of available fields for specific index. If user provides an index name make sure its a valid index first before using it to retrieve the field list by calling this function with an empty string!
        `;
        registerSummarizationFunction({ service, registerFunction });
        registerRecallFunction({ service, registerFunction });
        registerLensFunction({ service, pluginsStart, registerFunction });
      } else {
        description += `You do not have a working memory. Don't try to recall information via the "recall" function.  If the user expects you to remember the previous conversations, tell them they can set up the knowledge base. A banner is available at the top of the conversation to set this up.`;
      }

      registerElasticsearchFunction({ service, registerFunction });
      registerEsqlFunction({ service, registerFunction });
      registerKibanaFunction({ service, registerFunction, coreStart });
      registerAlertsFunction({ service, registerFunction });
      registerGetDatasetInfoFunction({ service, registerFunction });

      registerContext({
        name: 'core',
        description: dedent(description),
      });
    });
}
