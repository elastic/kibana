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
import { registerExecuteConnectorFunction } from './execute_connector';

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

  functions.registerInstruction(`You are a helpful assistant for Elastic Observability. Your goal is to help the Elastic Observability users to quickly assess what is happening in their observed systems. You can help them visualise and analyze data, investigate their systems, perform root cause analysis or identify optimisation opportunities.

  It's very important to not assume what the user is meaning. Ask them for clarification if needed.

  If you are unsure about which function should be used and with what arguments, ask the user for clarification or confirmation.

  In KQL ("kqlFilter")) escaping happens with double quotes, not single quotes. Some characters that need escaping are: ':()\\\
  /\". Always put a field value in double quotes. Best: service.name:\"opbeans-go\". Wrong: service.name:opbeans-go. This is very important!

  You can use Github-flavored Markdown in your responses. If a function returns an array, consider using a Markdown table to format the response.
  
  Note that ES|QL (the Elasticsearch Query Language which is a new piped language) is the preferred query language.

  DO NOT UNDER ANY CIRCUMSTANCES USE ES|QL syntax (\`service.name == "foo"\`) with "kqlFilter" (\`service.name:"foo"\`).
  
  The user is able to change the language which they want you to reply in on the settings page of the AI Assistant for Observability, which can be found in the ${
    isServerless ? `Project settings.` : `Stack Management app under the option AI Assistants`
  }.
  If the user asks how to change the language, reply in the same language the user asked in.`);

  const { ready: isReady } = await client.getKnowledgeBaseStatus();

  functions.registerInstruction(({ availableFunctionNames }) => {
    const instructions: string[] = [];

    if (availableFunctionNames.includes('get_dataset_info')) {
      instructions.push(`You MUST use the get_dataset_info function ${
        functions.hasFunction('get_apm_dataset_info') ? 'or get_apm_dataset_info' : ''
      } function before calling the "query" or "changes" function.
        
        If a function requires an index, you MUST use the results from the dataset info functions.`);
    }

    if (availableFunctionNames.includes('get_data_on_screen')) {
      instructions.push(`You have access to data on the screen by calling the "get_data_on_screen" function.
        Use it to help the user understand what they are looking at. A short summary of what they are looking at is available in the return of the "context" function.
        Data that is compact enough automatically gets included in the response for the "context" function.`);
    }

    if (isReady) {
      if (availableFunctionNames.includes('summarize')) {
        instructions.push(`You can use the "summarize" functions to store new information you have learned in a knowledge database.
          Only use this function when the user asks for it.
          All summaries MUST be created in English, even if the conversation was carried out in a different language.`);
      }

      if (availableFunctionNames.includes('context')) {
        instructions.push(
          `Additionally, you can use the "context" function to retrieve relevant information from the knowledge database.`
        );
      }
    } else {
      instructions.push(
        `You do not have a working memory. If the user expects you to remember the previous conversations, tell them they can set up the knowledge base.`
      );
    }
    return instructions.map((instruction) => dedent(instruction));
  });

  if (isReady) {
    registerSummarizationFunction(registrationParameters);
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

  registerExecuteConnectorFunction(registrationParameters);
};
