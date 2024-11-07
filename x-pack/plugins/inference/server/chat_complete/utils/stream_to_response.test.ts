/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { ChatCompletionEvent } from '@kbn/inference-common';
import { chunkEvent, tokensEvent, messageEvent } from '../../test_utils/chat_complete_events';
import { streamToResponse } from './stream_to_response';

describe('streamToResponse', () => {
  function fromEvents(...events: ChatCompletionEvent[]) {
    return of(...events);
  }

  it('returns a response with token count if both message and token events got emitted', async () => {
    const response = await streamToResponse(
      fromEvents(
        chunkEvent('chunk_1'),
        chunkEvent('chunk_2'),
        tokensEvent({ prompt: 1, completion: 2, total: 3 }),
        messageEvent('message')
      )
    );

    expect(response).toEqual({
      content: 'message',
      tokens: {
        completion: 2,
        prompt: 1,
        total: 3,
      },
      toolCalls: [],
    });
  });

  it('returns a response with tool calls if present', async () => {
    const someToolCall = {
      toolCallId: '42',
      function: {
        name: 'my_tool',
        arguments: {},
      },
    };
    const response = await streamToResponse(
      fromEvents(chunkEvent('chunk_1'), messageEvent('message', [someToolCall]))
    );

    expect(response).toEqual({
      content: 'message',
      toolCalls: [someToolCall],
    });
  });

  it('returns a response without token count if only message got emitted', async () => {
    const response = await streamToResponse(
      fromEvents(chunkEvent('chunk_1'), messageEvent('message'))
    );

    expect(response).toEqual({
      content: 'message',
      toolCalls: [],
    });
  });

  it('rejects an error if message event is not emitted', async () => {
    await expect(
      streamToResponse(fromEvents(chunkEvent('chunk_1'), tokensEvent()))
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"No message event found"`);
  });
});
