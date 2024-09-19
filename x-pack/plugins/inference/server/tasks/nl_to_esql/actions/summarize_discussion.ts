/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, tap } from 'rxjs';
import { withoutOutputUpdateEvents } from '../../..';
import { Message } from '../../../../common';
import { ToolSchema } from '../../../../common';
import type { ActionsOptionsBase } from './types';

const summarizeDiscussionSchema = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'The requested summary of the conversation',
    },
  },
  required: ['summary'] as const,
} satisfies ToolSchema;

export const summarizeDiscussionFn = ({
  client,
  connectorId,
  functionCalling,
  logger,
  output$,
}: ActionsOptionsBase) => {
  return async function summarizeDiscussion({ messages }: { messages: Message[] }) {
    const result = await lastValueFrom(
      client
        .output('summarize_discussion', {
          connectorId,
          functionCalling,
          system: `
      You are an helpful Elastic assistant in charge of helping the user generating
      ES|QL queries. Specifically, you current role is to extract from a discussion
      all the information that could be useful to answer the user's question and generate
      an ES|QL query.

      Make sure to include ALL information that can be useful to generate, including:
      - which index or data view to perform the query against
      - the known fields, their type and their description
      - the question that needs to be answered with an ES|QL query
      - Any previous query that may be mentioned

      Your role is only to retrieve and extract the info that are present in the conversation, not to invent
      any. E.g. if there are no description attached to the index's schema, don't invent any.

      Here are a few examples:
      ${examples}
      `,
          previousMessages: messages,
          input: `Please extract the requested summary from the current discussion, as specified in your system
      instructions.
      `,
          schema: summarizeDiscussionSchema,
        })
        .pipe(
          withoutOutputUpdateEvents(),
          tap((event) => {
            output$.next(event);
          })
        )
    );
    const summary = result.output.summary;
    return { summary };
  };
};

const examples = `

 #example 1

 ## message list:

  [
    {
      "role": "user",
      "content" "Show me a query to display the amount of order per month over the past year"
    },
    {
      "content": {
        "indices": [
          "kibana_sample_data_ecommerce"
        ],
        "fields": [
          "order_date:date",
          "order_id:keyword"
        ]
      }
    }
  ]

  ## expected summary

  The user wants to generate an ES|QL query to display the amount of orders per month over the past year.
  The query should target the index 'kibana_sample_data_ecommerce'.
  The relevant fields for this query are:
    - order_date of type date
    - order_id of type keyword

 #example 2

 ## message list:

  [
    {
      "role": "user",
      "content" "Show me a query to display the amount of order per month over the past year"
    }
  ]

  ## expected summary

  The user wants to generate an ES|QL query to display the amount of orders per month over the past year.
  There are no indications about which index should be targeted.
  There are no indications about the index's schema.

 #example 3

 ## message list:

  [
    {
      "role": "user",
      "content" "Can you convert this SPL query to ESQL? \`index=network_firewall "SYN Timeout" | stats count by dest\`"
    }
  ]

  ## expected summary

  The user wants to convert a SPL query to ESQL.
  The SPL query is: \`index=network_firewall "SYN Timeout" | stats count by dest\`.
  The query should target the index 'network_firewall'.
  The query should re-use the fields from the SPL query.
\`
`;
