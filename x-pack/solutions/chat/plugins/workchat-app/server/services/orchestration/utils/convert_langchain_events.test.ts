/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, lastValueFrom, of, toArray } from 'rxjs';
import { langchainToChatEvents } from './convert_langchain_events';
import { AIMessageChunk, AIMessage } from '@langchain/core/messages';
import { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';

const createLangchainEvent = ({
  event,
  name,
  data,
  metadata = {},
}: {
  event: string;
  name: string;
  data: any;
  metadata?: Record<string, any>;
}): LangchainStreamEvent => ({
  event,
  name,
  data,
  metadata,
  run_id: 'test-run-id',
});

describe('langchainToChatEvents', () => {
  const runName = 'test-run';

  it('should convert chat model stream events to message chunks', async () => {
    const chunk = new AIMessageChunk({ content: 'Hello world', id: 'test-message-id' });

    const event = createLangchainEvent({
      event: 'on_chat_model_stream',
      name: 'chat_model',
      data: { chunk },
    });

    const result = await firstValueFrom(of(event).pipe(langchainToChatEvents({ runName })));

    expect(result).toEqual({
      type: 'message_chunk',
      content_chunk: 'Hello world',
      message_id: 'test-message-id',
    });
  });

  it('should convert agent chain end events to messages', async () => {
    const message = new AIMessage({ content: 'Agent response', id: 'test-message-id' });

    const event = createLangchainEvent({
      event: 'on_chain_end',
      name: 'agent',
      data: {
        output: {
          addedMessages: [message],
        },
      },
    });

    const result = await firstValueFrom(of(event).pipe(langchainToChatEvents({ runName })));

    expect(result).toEqual({
      type: 'message',
      message: {
        content: 'Agent response',
        type: 'assistant_message',
        id: 'test-message-id',
        toolCalls: [],
        createdAt: expect.any(String),
      },
    });
  });

  it('should convert tool end events to tool results', async () => {
    const event = createLangchainEvent({
      event: 'on_tool_end',
      name: 'tool',
      data: {
        output: {
          tool_call_id: 'test-tool-call-id',
          content: 'Tool execution result',
        },
      },
      metadata: { langgraph_node: 'tools' },
    });

    const result = await firstValueFrom(of(event).pipe(langchainToChatEvents({ runName })));

    expect(result).toEqual({
      type: 'tool_result',
      toolResult: {
        callId: 'test-tool-call-id',
        result: 'Tool execution result',
      },
    });
  });

  it('should handle multiple events in sequence', async () => {
    const events: LangchainStreamEvent[] = [
      createLangchainEvent({
        event: 'on_chat_model_stream',
        name: 'chat_model',
        data: {
          chunk: new AIMessageChunk({ content: 'Hello', id: 'test-run-id' }),
        },
      }),
      createLangchainEvent({
        event: 'on_tool_end',
        name: 'tool',
        data: {
          output: {
            tool_call_id: 'tool-1',
            content: 'Tool result',
          },
        },
        metadata: { langgraph_node: 'tools' },
      }),
    ];

    const results = await lastValueFrom(
      of(...events)
        .pipe(langchainToChatEvents({ runName }))
        .pipe(toArray())
    );

    expect(results).toEqual([
      {
        type: 'message_chunk',
        content_chunk: 'Hello',
        message_id: 'test-run-id',
      },
      {
        type: 'tool_result',
        toolResult: {
          callId: 'tool-1',
          result: 'Tool result',
        },
      },
    ]);
  });

  it('should return empty array for unhandled events', async () => {
    const event = createLangchainEvent({
      event: 'on_chain_start',
      name: 'some_chain',
      data: {},
    });

    const result = await lastValueFrom(
      of(event).pipe(langchainToChatEvents({ runName })).pipe(toArray())
    );

    expect(result).toEqual([]);
  });
});
