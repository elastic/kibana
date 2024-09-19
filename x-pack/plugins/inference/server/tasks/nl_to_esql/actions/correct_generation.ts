/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, tap } from 'rxjs';
import { ToolOptions } from '../../../../common/chat_complete/tools';
import { Message, MessageRole, ToolSchema } from '../../../../common';
import type { ActionsOptionsBase } from './types';
import { withoutTokenCountEvents } from '../../../../common/chat_complete/without_token_count_events';

const correctGenerationSchema = {
  type: 'object',
  properties: {
    correction: {
      type: 'string',
      description: 'The corrected answer',
    },
  },
  required: ['correction'] as const,
} satisfies ToolSchema;

export const correctEsqlGenerationFn = <TToolOptions extends ToolOptions>({
  client,
  connectorId,
  logger,
  output$,
  functionCalling,
}: ActionsOptionsBase) => {
  return async function correctEsqlGeneration({
    messages,
    generatedQuery,
    documentation,
    review,
  }: {
    messages: Message[];
    generatedQuery: string;
    documentation: Record<string, string>;
    review: string;
  }) {
    const result = await lastValueFrom(
      client
        .chatComplete({
          connectorId,
          functionCalling,
          system: `
      You are an helpful Elastic assistant in charge of improving an answer related to an ES|QL question.

      You will be given:
      - the original user question
      - the answer another assistant provided
      - a review of this answer

      Given those, please improve the answer according to the review.
      You must correct and return the whole answer. If there is text content in the answer, return it too.
      If the review is valid, just don't do any modifications and return the answer as it was provided as input.

      Here is the ES|QL documentation that was used to generate the query. Please use it if necessary to improve the query:

      \`\`\`json
      ${JSON.stringify(documentation, undefined, 2)}
      \`\`\`

      `,
          messages: [
            ...messages,
            {
              role: MessageRole.User,
              content: `
        # User question

        (See previous messages)

        # Provided answer

        ${generatedQuery}

        # Review

        ${JSON.stringify(review)}
      `,
            },
          ],
        })
        .pipe(
          withoutTokenCountEvents(),
          tap((event) => {
            output$.next(event);
          })
        )
    );

    return result.content;
  };
};
