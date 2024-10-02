/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Attributes, Span } from '@opentelemetry/api';
import { FunctionDefinition } from 'openai/resources';
import { ignoreElements, last, merge, OperatorFunction, share, tap } from 'rxjs';
import { Message, StreamingChatResponseEventType } from '../../../../common';
import { ChatEvent } from '../../../../common/conversation_complete';
import { concatenateChatCompletionChunks } from '../../../../common/utils/concatenate_chat_completion_chunks';
import { withoutTokenCountEvents } from '../../../../common/utils/without_token_count_events';
import { getLangtraceSpanAttributes } from '../instrumentation/get_langtrace_span_attributes';

export enum GenAIServiceProvider {
  OpenAI = 'OpenAI',
  Azure = 'Azure',
  Anthropic = 'Anthropic',
}

const EVENT_STREAM_START = 'stream.start';
const EVENT_STREAM_OUTPUT = 'stream.output';

export function withGenAIChatCompleteSpan<T extends ChatEvent>({
  span,
  model,
  messages,
  serviceProvider,
  functions,
}: {
  span: Span;
  model: string;
  messages: Message[];
  serviceProvider: GenAIServiceProvider;
  functions?: Array<Pick<FunctionDefinition, 'name' | 'description' | 'parameters'>>;
}): OperatorFunction<T, T> {
  const attributes: Attributes = {
    ...getLangtraceSpanAttributes(),
    'langtrace.service.name': serviceProvider,
    'llm.api': '/chat/completions',
    'http.max.retries': 0,
    // dummy URL
    'url.full': 'http://localhost:3000/chat/completions',
    'http.timeout': 120 * 1000,
    'llm.prompts': JSON.stringify(
      messages.map((message) => ({
        role: message.message.role,
        content: [
          message.message.content,
          message.message.function_call ? JSON.stringify(message.message.function_call) : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
      }))
    ),
    'llm.model': model,
    'llm.stream': true,
    ...(functions
      ? {
          'llm.tools': JSON.stringify(
            functions.map((fn) => ({
              function: fn,
              type: 'function',
            }))
          ),
        }
      : {}),
  };

  span.setAttributes(attributes);

  return (source$) => {
    const shared$ = source$.pipe(share());

    span.addEvent(EVENT_STREAM_START);

    const passThrough$ = shared$.pipe(
      tap((value) => {
        if (value.type === StreamingChatResponseEventType.ChatCompletionChunk) {
          span.addEvent(EVENT_STREAM_OUTPUT, {
            response: value.message.content,
          });
          return;
        }

        span.setAttributes({
          'llm.token.counts': JSON.stringify({
            input_tokens: value.tokens.prompt,
            output_tokens: value.tokens.completion,
            total_tokens: value.tokens.total,
          }),
        });
      })
    );

    return merge(
      passThrough$,
      shared$.pipe(
        withoutTokenCountEvents(),
        concatenateChatCompletionChunks(),
        last(),
        tap((message) => {
          span.setAttribute(
            'llm.responses',
            JSON.stringify([
              {
                role: 'assistant',
                content: message.message.content,
              },
            ])
          );
        }),
        ignoreElements()
      )
    );
  };
}
