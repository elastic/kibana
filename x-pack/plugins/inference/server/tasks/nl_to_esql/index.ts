/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { isEmpty, once } from 'lodash';
import { Observable, from, map, merge, of, switchMap } from 'rxjs';
import { ToolSchema, generateFakeToolCallId, isChatCompletionMessageEvent } from '../../../common';
import {
  ChatCompletionChunkEvent,
  ChatCompletionMessageEvent,
  Message,
  MessageRole,
} from '../../../common/chat_complete';
import { ToolChoiceType, type ToolOptions, ToolCall } from '../../../common/chat_complete/tools';
import { withoutTokenCountEvents } from '../../../common/chat_complete/without_token_count_events';
import { OutputCompleteEvent, OutputEventType } from '../../../common/output';
import { withoutOutputUpdateEvents } from '../../../common/output/without_output_update_events';
import { INLINE_ESQL_QUERY_REGEX } from '../../../common/tasks/nl_to_esql/constants';
import { correctCommonEsqlMistakes } from '../../../common/tasks/nl_to_esql/correct_common_esql_mistakes';
import type { InferenceClient } from '../../types';
import { EsqlDocumentBase } from './doc_base';

type NlToEsqlTaskEvent<TToolOptions extends ToolOptions> =
  | OutputCompleteEvent<
      'request_documentation',
      { keywords: string[]; requestedDocumentation: Record<string, string> }
    >
  | ChatCompletionChunkEvent
  | ChatCompletionMessageEvent<TToolOptions>;

const loadDocBase = once(() => EsqlDocumentBase.load());

const requestDocumentationSchema = {
  type: 'object',
  properties: {
    commands: {
      type: 'array',
      items: {
        type: 'string',
      },
      description:
        'ES|QL source and processing commands you want to analyze before generating the query.',
    },
    functions: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'ES|QL functions you want to analyze before generating the query.',
    },
  },
} satisfies ToolSchema;

export function naturalLanguageToEsql<TToolOptions extends ToolOptions>({
  client,
  connectorId,
  tools,
  toolChoice,
  logger,
  ...rest
}: {
  client: Pick<InferenceClient, 'output' | 'chatComplete'>;
  connectorId: string;
  logger: Pick<Logger, 'debug'>;
} & TToolOptions &
  ({ input: string } | { messages: Message[] })): Observable<NlToEsqlTaskEvent<TToolOptions>> {
  const messages: Message[] =
    'input' in rest ? [{ role: MessageRole.User, content: rest.input }] : rest.messages;

  return from(loadDocBase()).pipe(
    switchMap((docBase) => {
      const systemMessage = docBase.getSystemMessage();

      const askLlmToRespond = generateEsqlTask({
        connectorId,
        chatCompleteApi: client.chatComplete,
        messages,
        docBase,
        logger,
        systemMessage,
        toolOptions: {
          tools,
          toolChoice,
        },
      });

      return requestDocumentation({
        connectorId,
        outputApi: client.output,
        messages,
        system: systemMessage,
        toolOptions: {
          tools,
          toolChoice,
        },
      }).pipe(
        switchMap((documentationEvent) => {
          return askLlmToRespond({
            documentationRequest: {
              commands: documentationEvent.output.commands,
              functions: documentationEvent.output.functions,
            },
          });
        })
      );
    })
  );
}

const generateEsqlTask = <TToolOptions extends ToolOptions>({
  chatCompleteApi,
  connectorId,
  systemMessage,
  messages,
  toolOptions: { tools, toolChoice },
  docBase,
  logger,
}: {
  connectorId: string;
  systemMessage: string;
  messages: Message[];
  toolOptions: ToolOptions;
  chatCompleteApi: InferenceClient['chatComplete'];
  docBase: EsqlDocumentBase;
  logger: Pick<Logger, 'debug'>;
}) => {
  return function askLlmToRespond({
    documentationRequest: { commands, functions },
  }: {
    documentationRequest: { commands?: string[]; functions?: string[] };
  }): Observable<NlToEsqlTaskEvent<TToolOptions>> {
    const keywords = [...(commands ?? []), ...(functions ?? [])];
    const requestedDocumentation = docBase.getDocumentation(keywords);
    const fakeRequestDocsToolCall = createFakeTooCall(commands, functions);

    return merge(
      of<
        OutputCompleteEvent<
          'request_documentation',
          { keywords: string[]; requestedDocumentation: Record<string, string> }
        >
      >({
        type: OutputEventType.OutputComplete,
        id: 'request_documentation',
        output: {
          keywords,
          requestedDocumentation,
        },
        content: '',
      }),
      chatCompleteApi({
        connectorId,
        system: `${systemMessage}

          # Current task

          Your current task is to respond to the user's question. If there is a tool
          suitable for answering the user's question, use that tool, preferably
          with a natural language reply included.

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
        toolChoice,
        tools: {
          ...tools,
          request_documentation: {
            description: 'Request additional ES|QL documentation if needed',
            schema: requestDocumentationSchema,
          },
        },
      }).pipe(
        withoutTokenCountEvents(),
        map((generateEvent) => {
          if (isChatCompletionMessageEvent(generateEvent)) {
            return {
              ...generateEvent,
              content: generateEvent.content
                ? correctEsqlMistakes({ content: generateEvent.content, logger })
                : generateEvent.content,
            };
          }

          return generateEvent;
        }),
        switchMap((generateEvent) => {
          if (isChatCompletionMessageEvent(generateEvent)) {
            const onlyToolCall =
              generateEvent.toolCalls.length === 1 ? generateEvent.toolCalls[0] : undefined;

            if (onlyToolCall?.function.name === 'request_documentation') {
              const args = onlyToolCall.function.arguments;

              return askLlmToRespond({
                documentationRequest: {
                  commands: args.commands,
                  functions: args.functions,
                },
              });
            }
          }

          return of(generateEvent);
        })
      )
    );
  };
};

const correctEsqlMistakes = ({
  content,
  logger,
}: {
  content: string;
  logger: Pick<Logger, 'debug'>;
}) => {
  return content.replaceAll(INLINE_ESQL_QUERY_REGEX, (_match, query) => {
    const correction = correctCommonEsqlMistakes(query);
    if (correction.isCorrection) {
      logger.debug(`Corrected query, from: \n${correction.input}\nto:\n${correction.output}`);
    }
    return '```esql\n' + correction.output + '\n```';
  });
};

const requestDocumentation = ({
  outputApi,
  system,
  messages,
  connectorId,
  toolOptions: { tools, toolChoice },
}: {
  outputApi: InferenceClient['output'];
  system: string;
  messages: Message[];
  connectorId: string;
  toolOptions: ToolOptions;
}) => {
  const hasTools = !isEmpty(tools) && toolChoice !== ToolChoiceType.none;

  return outputApi('request_documentation', {
    connectorId,
    system,
    previousMessages: messages,
    input: `Based on the previous conversation, request documentation
        from the ES|QL handbook to help you get the right information
        needed to generate a query.

        Examples for functions and commands:
        - Do you need to group data? Request \`STATS\`.
        - Extract data? Request \`DISSECT\` AND \`GROK\`.
        - Convert a column based on a set of conditionals? Request \`EVAL\` and \`CASE\`.

        ${
          hasTools
            ? `### Tools

        The following tools will be available to be called in the step after this.

        \`\`\`json
        ${JSON.stringify({
          tools,
          toolChoice,
        })}
        \`\`\``
            : ''
        }
      `,
    schema: requestDocumentationSchema,
  }).pipe(withoutOutputUpdateEvents());
};

const createFakeTooCall = (
  commands: string[] | undefined,
  functions: string[] | undefined
): ToolCall => {
  return {
    function: {
      name: 'request_documentation',
      arguments: {
        commands,
        functions,
      },
    },
    toolCallId: generateFakeToolCallId(),
  };
};
