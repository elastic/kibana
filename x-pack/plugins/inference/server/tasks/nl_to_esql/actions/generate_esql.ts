/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, map, merge, of, switchMap, tap, lastValueFrom } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { ToolCall, ToolOptions } from '../../../../common/chat_complete/tools';
import {
  correctCommonEsqlMistakes,
  generateFakeToolCallId,
  isChatCompletionMessageEvent,
  Message,
  MessageRole,
} from '../../../../common';
import { InferenceClient, withoutTokenCountEvents, withoutChunkEvents } from '../../..';
import { OutputCompleteEvent, OutputEventType } from '../../../../common/output';
import { INLINE_ESQL_QUERY_REGEX } from '../../../../common/tasks/nl_to_esql/constants';
import { EsqlDocumentBase } from '../doc_base';
import { requestDocumentationSchema } from './shared';
import type { NlToEsqlTaskEvent } from '../types';
import type { ActionsOptionsBase } from './types';

export const generateEsqlTask = <TToolOptions extends ToolOptions>({
  client,
  connectorId,
  systemMessage,
  functionCalling,
  logger,
  output$,
}: ActionsOptionsBase & {
  systemMessage: string;
}) => {
  return async function generateEsql({
    messages,
    documentationRequest: { keywords, requestedDocumentation },
  }: {
    messages: Message[];
    documentationRequest: { keywords: string[]; requestedDocumentation: Record<string, string> };
  }) {
    const fakeRequestDocsToolCall = createFakeTooCall(keywords);

    const result = await lastValueFrom(
      client
        .chatComplete({
          connectorId,
          functionCalling,
          system: `${systemMessage}

          # Current task

          Your current task is to respond to the user's question.

          Format any ES|QL query as follows:
          \`\`\`esql
          <query>
          \`\`\`

          When generating ES|QL, it is VERY important that you only use commands and functions present in the
          requested documentation, and follow the syntax as described in the documentation and its examples.
          Assume that ONLY the set of capabilities described in the provided ES|QL documentation is valid, and
          do not try to guess parameters or syntax based on other query languages.

          If what the user is asking for is not technically achievable with ES|QL's capabilities, just inform
          the user. DO NOT invent capabilities not described in the documentation just to provide
          a positive answer to the user. E.g. Pagination is not supported by the language, do not try to invent
          workarounds based on other languages.

          When converting queries from one language to ES|QL, make sure that the functions are available
          and documented in ES|QL. E.g., for SPL's LEN, use LENGTH. For IF, use CASE.
        `,
          messages: [
            ...messages,
            {
              role: MessageRole.Assistant,
              content: null,
              toolCalls: [fakeRequestDocsToolCall],
            },
            {
              role: MessageRole.Tool,
              response: {
                documentation: requestedDocumentation,
              },
              toolCallId: fakeRequestDocsToolCall.toolCallId,
            },
          ],
        })
        .pipe(
          withoutTokenCountEvents(),
          map((event) => {
            if (isChatCompletionMessageEvent(event)) {
              return {
                ...event,
                content: event.content
                  ? correctEsqlMistakes({ content: event.content, logger })
                  : event.content,
              };
            }
            return event;
          }),
          tap((event) => {
            output$.next(event);
          }),
          withoutChunkEvents()
        )
    );

    return { content: result.content };
  };
};

const correctEsqlMistakes = ({ content, logger }: { content: string; logger: Logger }) => {
  return content.replaceAll(INLINE_ESQL_QUERY_REGEX, (_match, query) => {
    const correction = correctCommonEsqlMistakes(query);
    if (correction.isCorrection) {
      logger.debug(`Corrected query, from: \n${correction.input}\nto:\n${correction.output}`);
    }
    return '```esql\n' + correction.output + '\n```';
  });
};

const createFakeTooCall = (keywords: string[]): ToolCall => {
  return {
    function: {
      name: 'request_documentation',
      arguments: {
        keywords,
      },
    },
    toolCallId: generateFakeToolCallId(),
  };
};
