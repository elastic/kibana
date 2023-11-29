/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Serializable } from '@kbn/utility-types';
import dedent from 'dedent';
import { last, omit } from 'lodash';
import { CreateChatCompletionResponse } from 'openai';
import { MessageRole, RegisterFunctionDefinition } from '../../common/types';
import type { ObservabilityAIAssistantService } from '../types';

export function registerRecallFunction({
  service,
  registerFunction,
}: {
  service: ObservabilityAIAssistantService;
  registerFunction: RegisterFunctionDefinition;
}) {
  registerFunction(
    {
      name: 'recall',
      contexts: ['core'],
      description: `Use this function to recall earlier learnings. Anything you will summarize can be retrieved again later via this function.
      
      The learnings are sorted by score, descending.
      
      Make sure the query covers ONLY the following aspects:
      - Anything you've inferred from the user's request, but is not mentioned in the user's request
      - The functions you think might be suitable for answering the user's request. If there are multiple functions that seem suitable, create multiple queries. Use the function name in the query.  

      DO NOT include the user's request. It will be added internally.
      
      The user asks: "can you visualise the average request duration for opbeans-go over the last 7 days?"
      You recall: {
        "queries": [
          "APM service,
          "lens function usage",
          "get_apm_timeseries function usage"    
        ],
        "contexts": [
          "lens",
          "apm"
        ]
      }`,
      descriptionForUser: 'This function allows the assistant to recall previous learnings.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          queries: {
            type: 'array',
            additionalItems: false,
            additionalProperties: false,
            description: 'The query for the semantic search',
            items: {
              type: 'string',
            },
          },
          contexts: {
            type: 'array',
            additionalItems: false,
            additionalProperties: false,
            description:
              'Contexts or categories of internal documentation that you want to search for. By default internal documentation will be excluded. Use `apm` to get internal APM documentation, `lens` to get internal Lens documentation, or both.',
            items: {
              type: 'string',
              enum: ['apm', 'lens'],
            },
          },
        },
        required: ['queries', 'contexts'],
      } as const,
    },
    async ({ arguments: { queries, contexts }, messages, connectorId }, signal) => {
      const systemMessage = messages.find((message) => message.message.role === MessageRole.System);

      if (!systemMessage) {
        return {
          content: [] as unknown as Serializable,
        };
      }

      const userMessage = last(
        messages.filter((message) => message.message.role === MessageRole.User)
      );

      const queriesWithUserPrompt =
        userMessage && userMessage.message.content
          ? [userMessage.message.content, ...queries]
          : queries;

      const recallResponse = await service.callApi(
        'POST /internal/observability_ai_assistant/functions/recall',
        {
          params: {
            body: {
              queries: queriesWithUserPrompt,
              contexts,
            },
          },
          signal,
        }
      );

      if (recallResponse.entries.length === 0) {
        return {
          content: [] as unknown as Serializable,
        };
      }

      const suggestions = recallResponse.entries.map((entry) =>
        omit(entry, 'labels', 'is_correction', 'score')
      );

      const systemMessageExtension =
        dedent(`You have the function called select available to help you gather more information about documents you think are relevant to the conversation.
      
          Make sure you select the most relevant documents. 
          It is critical that you don't select more than 5 documents.
          Only consider the value of the "text" property when deciding what is relevant.
          Call the function by passing the IDs of the documents that you found to be most relevant to the conversation.
          Make sure to pass in the IDs in the order most relevant to least relevant.
          If none of the documents seem relevant, you can call select with an empty list.
          It is critical that you only call the select function with the value of the "id" property of the documents which are relevant.
            
          Here is an example of what the JSON list of documents might look like:
          [
            {"text":"Lens can be used to visualize most kinds of obsebrvaility signal data", "id":"some_sample_id_1"},
            {"text":"Kibana alerting allows you to define alerts that trigger when certain conditions are met. Alerts in Kibana are based on Elasticsearch queries.", "id":"some_sample_id_2"},
            {"text":"Synthetic sugars found in sodas still make your body believe your taking in sugar", "id":"some_sample_id_3"},
            {"text":"Bergmann's rule is an ecogeographical rule that states that within a broadly distributed taxonomic clade, populations and species of larger size are found in colder environments, while populations and species of smaller size are found in warmer regions. ", "id":"some_sample_id_4"},
            {"text":"To make it easier to query your data in Elasticsearch, it is important to store it in a way that makes it effective to query", "id":"some_sample_id_5"},
            {"text":"Kibana Maps gives you a way to visualize data with a geographical perspective", "id":"some_sample_id_6"},
            {"text":"Machine learning is a good way to scale compute resources to handle large amount of data", "id":"some_sample_id_7"},
            {"text":"SLOs are a good way for a service manager to define the technical requirements for healthy service operation", "id":"some_sample_id_8"},
            {"text":"Alerts allow you to react to issues as they happen without keeping a particular dashboard open at all times.", "id":"some_sample_id_9"},
            {"text":"You can use Metricbeat to monitor your Elasticsearch instances", "id":"some_sample_id_10"},
          ]
          Don't use the IDs found in this example.

        `);
      const extendedSystemMessage = {
        ...systemMessage,
        message: {
          ...systemMessage.message,
          content: `${systemMessage.message.content}\n\n${systemMessageExtension}`,
        },
      };

      const userMessageExtension = `\n\nHere are some documents that may be relevant to my question:\n\n${JSON.stringify(
        suggestions,
        null,
        2
      )}`;

      const extendedUserMessage = userMessage
        ? {
            ...userMessage,
            message: {
              ...userMessage.message,
              content: `${userMessage.message.content}${userMessageExtension}`,
            },
          }
        : {
            '@timestamp': new Date().toISOString(),
            message: {
              content: `${queries}${userMessageExtension}`,
              role: MessageRole.User,
            },
          };

      const select = {
        name: 'select',
        description:
          'Use this function to obtain more information about documents that where recalled which contain information relevant to the conversation.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            selection: {
              description: 'The IDs of the documents considered as relevant to the conversation',
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          required: ['selection'],
        } as const,
        contexts: ['core'],
      };

      const selectDocumentsResponse = (await service.callApi(
        'POST /internal/observability_ai_assistant/chat',
        {
          params: {
            query: {
              stream: false,
            },
            body: {
              connectorId,
              messages: [extendedSystemMessage, extendedUserMessage],
              functions: [select],
              functionCall: 'select',
            },
          },
          signal,
        }
      )) as CreateChatCompletionResponse;

      if (selectDocumentsResponse.choices[0].message?.function_call?.name !== 'select') {
        // For some reason the LLM didn't execute the requested function, let's return all KB hits for now
        return {
          content: suggestions as unknown as Serializable,
        };
      }

      // What else could go wrong here?

      const selectedDocumentIds = JSON.parse(
        selectDocumentsResponse.choices[0].message.function_call.arguments!
      ).selection;

      const relevantDocuments = suggestions
        .slice(0, 5)
        .filter((suggestion) => selectedDocumentIds.includes(suggestion.id));

      return {
        content: relevantDocuments as unknown as Serializable,
      };
    }
  );
}
