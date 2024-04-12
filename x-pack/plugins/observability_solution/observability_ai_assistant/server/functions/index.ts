/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { registerContextFunction } from './context';
import { registerSummarizationFunction } from './summarize';
import type { RegistrationCallback } from '../service/types';
import { registerElasticsearchFunction } from './elasticsearch';
import { registerGetDatasetInfoFunction } from './get_dataset_info';
import { registerKibanaFunction } from './kibana';

export type FunctionRegistrationParameters = Omit<
  Parameters<RegistrationCallback>[0],
  'registerContext' | 'hasFunction'
>;

export const registerFunctions: RegistrationCallback = async ({
  client,
  functions,
  resources,
  signal,
}) => {
  const registrationParameters: FunctionRegistrationParameters = {
    client,
    functions,
    resources,
    signal,
  };

  const isServerless = !!resources.plugins.serverless;

  return client.getKnowledgeBaseStatus().then((response) => {
    const isReady = response.ready;

    let description = dedent(
      `You are a helpful assistant for Elastic Observability. Your goal is to help the Elastic Observability users to quickly assess what is happening in their observed systems. You can help them visualise and analyze data, investigate their systems, perform root cause analysis or identify optimisation opportunities.

        It's very important to not assume what the user is meaning. Ask them for clarification if needed.

        If you are unsure about which function should be used and with what arguments, ask the user for clarification or confirmation.

        In KQL, escaping happens with double quotes, not single quotes. Some characters that need escaping are: ':()\\\
        /\". Always put a field value in double quotes. Best: service.name:\"opbeans-go\". Wrong: service.name:opbeans-go. This is very important!

        You can use Github-flavored Markdown in your responses. If a function returns an array, consider using a Markdown table to format the response.

        If multiple functions are suitable, use the most specific and easy one. E.g., when the user asks to visualise APM data, use the APM functions (if available) rather than "query".

        Note that ES|QL (the Elasticsearch query language, which is NOT Elasticsearch SQL, but a new piped language) is the preferred query language.

        You MUST use the "query" function when the user wants to:
        - visualize data
        - run any arbitrary query
        - breakdown or filter ES|QL queries that are displayed on the current page
        - convert queries from another language to ES|QL
        - asks general questions about ES|QL

        DO NOT UNDER ANY CIRCUMSTANCES generate ES|QL queries or explain anything about the ES|QL query language yourself.
        DO NOT UNDER ANY CIRCUMSTANCES try to correct an ES|QL query yourself - always use the "query" function for this.

        Even if the "context" function was used before that, follow it up with the "query" function. If a query fails, do not attempt to correct it yourself. Again you should call the "query" function,
        even if it has been called before.

        When the "visualize_query" function has been called, a visualization has been displayed to the user. DO NOT UNDER ANY CIRCUMSTANCES follow up a "visualize_query" function call with your own visualization attempt.
        If the "execute_query" function has been called, summarize these results for the user. The user does not see a visualization in this case.

        Use the "get_dataset_info" function if it is not clear what fields or indices the user means, or if you want to get more information about the mappings.

        If the "get_dataset_info" function returns no data, and the user asks for a query, generate a query anyway with the "query" function, but be explicit about it potentially being incorrect.

        ${
          functions.hasFunction('get_data_on_screen')
            ? `You have access to data on the screen by calling the "get_data_on_screen" function.
        Use it to help the user understand what they are looking at. A short summary of what they are looking at is available in the return of the "context" function.
        Data that is compact enough automatically gets included in the response for the "context" function.
        `
            : ''
        }

        The user is able to change the language which they want you to reply in on the settings page of the AI Assistant for Observability, which can be found in the ${
          isServerless ? `Project settings.` : `Stack Management app under the option AI Assistants`
        }.
        If the user asks how to change the language, reply in the same language the user asked in.
        `
    );

    if (isReady) {
      description += `You can use the "summarize" functions to store new information you have learned in a knowledge database. Once you have established that you did not know the answer to a question, and the user gave you this information, it's important that you create a summarisation of what you have learned and store it in the knowledge database. Don't create a new summarization if you see a similar summarization in the conversation, instead, update the existing one by re-using its ID.
        All summaries MUST be created in English, even if the conversation was carried out in a different language.

        Additionally, you can use the "context" function to retrieve relevant information from the knowledge database.

        `;

      registerSummarizationFunction(registrationParameters);
    } else {
      description += `You do not have a working memory. If the user expects you to remember the previous conversations, tell them they can set up the knowledge base.`;
    }

    registerContextFunction({ ...registrationParameters, isKnowledgeBaseAvailable: isReady });

    registerElasticsearchFunction(registrationParameters);
    const request = registrationParameters.resources.request;

    if ('id' in request) {
      registerKibanaFunction({
        ...registrationParameters,
        resources: {
          ...registrationParameters.resources,
          request,
        },
      });
    }
    registerGetDatasetInfoFunction(registrationParameters);

    functions.registerContext({
      name: 'core',
      description: dedent(description),
    });
  });
};
