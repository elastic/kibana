/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, isObservable, of, toArray } from 'rxjs';
import {
  ChatCompleteResponse,
  ChatCompletionEvent,
  ChatCompletionEventType,
} from '@kbn/inference-common';
import { createOutputApi } from './create_output_api';

describe('createOutputApi', () => {
  let chatComplete: jest.Mock;

  beforeEach(() => {
    chatComplete = jest.fn();
  });

  it('calls `chatComplete` with the right parameters', async () => {
    chatComplete.mockResolvedValue(Promise.resolve({ content: 'content', toolCalls: [] }));

    const output = createOutputApi(chatComplete);

    await output({
      id: 'id',
      stream: false,
      functionCalling: 'native',
      connectorId: '.my-connector',
      system: 'system',
      input: 'input message',
    });

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(chatComplete).toHaveBeenCalledWith({
      connectorId: '.my-connector',
      functionCalling: 'native',
      stream: false,
      system: 'system',
      messages: [
        {
          content: 'input message',
          role: 'user',
        },
      ],
    });
  });

  it('returns the expected value when stream=false', async () => {
    const chatCompleteResponse: ChatCompleteResponse = {
      content: 'content',
      toolCalls: [{ toolCallId: 'a', function: { name: 'foo', arguments: { arg: 1 } } }],
    };

    chatComplete.mockResolvedValue(Promise.resolve(chatCompleteResponse));

    const output = createOutputApi(chatComplete);

    const response = await output({
      id: 'my-id',
      stream: false,
      connectorId: '.my-connector',
      input: 'input message',
    });

    expect(response).toEqual({
      id: 'my-id',
      content: chatCompleteResponse.content,
      output: chatCompleteResponse.toolCalls[0].function.arguments,
    });
  });

  it('returns the expected value when stream=true', async () => {
    const sourceEvents: ChatCompletionEvent[] = [
      { type: ChatCompletionEventType.ChatCompletionChunk, content: 'chunk-1', tool_calls: [] },
      { type: ChatCompletionEventType.ChatCompletionChunk, content: 'chunk-2', tool_calls: [] },
      {
        type: ChatCompletionEventType.ChatCompletionMessage,
        content: 'message',
        toolCalls: [{ toolCallId: 'a', function: { name: 'foo', arguments: { arg: 1 } } }],
      },
    ];

    chatComplete.mockReturnValue(of(...sourceEvents));

    const output = createOutputApi(chatComplete);

    const response$ = await output({
      id: 'my-id',
      stream: true,
      connectorId: '.my-connector',
      input: 'input message',
    });

    expect(isObservable(response$)).toEqual(true);
    const events = await firstValueFrom(response$.pipe(toArray()));

    expect(events).toEqual([
      {
        content: 'chunk-1',
        id: 'my-id',
        type: 'output',
      },
      {
        content: 'chunk-2',
        id: 'my-id',
        type: 'output',
      },
      {
        content: 'message',
        id: 'my-id',
        output: {
          arg: 1,
        },
        type: 'complete',
      },
    ]);
  });
});
