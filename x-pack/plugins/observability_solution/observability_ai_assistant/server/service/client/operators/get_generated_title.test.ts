/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { filter, lastValueFrom, of, throwError, toArray } from 'rxjs';
import {
  ChatCompletionChunkEvent,
  Message,
  MessageRole,
  StreamingChatResponseEventType,
} from '../../../../common';
import { ChatEvent } from '../../../../common/conversation_complete';
import { GenAITracer } from '../instrumentation/gen_ai_tracer';
import { TITLE_CONVERSATION_FUNCTION_NAME, getGeneratedTitle } from './get_generated_title';

describe('getGeneratedTitle', () => {
  const messages: Message[] = [
    {
      '@timestamp': new Date().toISOString(),
      message: {
        content: 'A message',
        role: MessageRole.User,
      },
    },
  ];

  function createChatCompletionChunk(
    content: string | { content?: string; function_call?: { name: string; arguments: string } }
  ): ChatCompletionChunkEvent {
    const msg = typeof content === 'string' ? { content } : content;

    return {
      type: StreamingChatResponseEventType.ChatCompletionChunk,
      id: 'id',
      message: msg,
    };
  }

  function callGenerateTitle(...rest: [ChatEvent[]] | [{}, ChatEvent[]]) {
    const options = rest.length === 1 ? {} : rest[0];
    const chunks = rest.length === 1 ? rest[0] : rest[1];

    const chatSpy = jest.fn().mockImplementation(() => of(...chunks));

    const title$ = getGeneratedTitle({
      chat: chatSpy,
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
      },
      messages,
      tracer: {
        startActiveSpan: jest.fn(),
      } as unknown as GenAITracer,
      ...options,
    });

    return { chatSpy, title$ };
  }

  it('returns the given title as a string', async () => {
    const { title$ } = callGenerateTitle([
      createChatCompletionChunk({
        function_call: {
          name: 'title_conversation',
          arguments: JSON.stringify({ title: 'My title' }),
        },
      }),
    ]);

    const title = await lastValueFrom(
      title$.pipe(filter((event): event is string => typeof event === 'string'))
    );

    expect(title).toEqual('My title');
  });

  it('calls chat with the user message', async () => {
    const { chatSpy, title$ } = callGenerateTitle([
      createChatCompletionChunk({
        function_call: {
          name: TITLE_CONVERSATION_FUNCTION_NAME,
          arguments: JSON.stringify({ title: 'My title' }),
        },
      }),
    ]);

    await lastValueFrom(title$);

    const [name, params] = chatSpy.mock.calls[0];

    expect(name).toEqual('generate_title');
    expect(params.messages.length).toBe(2);
    expect(params.messages[1].message.content).toContain('A message');
  });

  it('strips quotes from the title', async () => {
    async function testTitle(title: string) {
      const { title$ } = callGenerateTitle([
        createChatCompletionChunk({
          function_call: {
            name: 'title_conversation',
            arguments: JSON.stringify({ title }),
          },
        }),
      ]);

      return await lastValueFrom(
        title$.pipe(filter((event): event is string => typeof event === 'string'))
      );
    }

    expect(await testTitle(`"My title"`)).toEqual('My title');
    expect(await testTitle(`'My title'`)).toEqual('My title');
    expect(await testTitle(`"User's request for a title"`)).toEqual(`User's request for a title`);
  });

  it('handles partial updates', async () => {
    const { title$ } = callGenerateTitle([
      createChatCompletionChunk({
        function_call: {
          name: 'title_conversation',
          arguments: '',
        },
      }),
      createChatCompletionChunk({
        function_call: {
          name: '',
          arguments: JSON.stringify({ title: 'My title' }),
        },
      }),
    ]);

    const title = await lastValueFrom(title$);

    expect(title).toEqual('My title');
  });

  it('ignores token count events and still passes them through', async () => {
    const { title$ } = callGenerateTitle([
      createChatCompletionChunk({
        function_call: {
          name: 'title_conversation',
          arguments: JSON.stringify({ title: 'My title' }),
        },
      }),
      {
        type: StreamingChatResponseEventType.TokenCount,
        tokens: {
          completion: 10,
          prompt: 10,
          total: 10,
        },
      },
    ]);

    const events = await lastValueFrom(title$.pipe(toArray()));

    expect(events).toEqual([
      'My title',
      {
        tokens: {
          completion: 10,
          prompt: 10,
          total: 10,
        },
        type: StreamingChatResponseEventType.TokenCount,
      },
    ]);
  });

  it('handles errors in chat and falls back to the default title', async () => {
    const chatSpy = jest
      .fn()
      .mockImplementation(() => throwError(() => new Error('Error generating title')));

    const logger = {
      debug: jest.fn(),
      error: jest.fn(),
    };

    const title$ = getGeneratedTitle({
      chat: chatSpy,
      logger,
      messages,
      tracer: {
        startActiveSpan: jest.fn(),
      } as unknown as GenAITracer,
    });

    const title = await lastValueFrom(title$);

    expect(title).toEqual('New conversation');

    expect(logger.error).toHaveBeenCalledWith('Error generating title');
  });
});
