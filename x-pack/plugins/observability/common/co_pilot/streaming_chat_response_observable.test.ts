/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BehaviorSubject } from 'rxjs';
import { CreateChatCompletionResponseChunk } from '.';
import { createStreamingChatResponseObservable } from './streaming_chat_response_observable';

describe('createStreamingChatResponseObservable', () => {
  it('parses streamed chunks correctly and emits an array of chunks', async () => {
    const subject = new BehaviorSubject('');

    const observable = createStreamingChatResponseObservable(subject);

    subject.next(`data: {"id":"chatcmpl-7P9yZS2gXZgAK6HCxXIpanuHerZKJ","object":"chat.completion.chunk","created":1686230903,"model":"gpt-4","choices":[{"index":0,"finish_reason":null,"delta":{"role":"assistant"}}],"usage":null}
    data: {"id":"chatcmpl-7P9yZS2gXZgAK6HCxXIpanuHerZKJ","object":"chat.completion.chunk","created":1686230903,"model":"gpt-4","choices":[{"index":0,"finish_reason":null,"delta":{"content":"The"}}],"usage":null}
    data: {"id":"chatcmpl-7P9yZS2gXZgAK6HCxXIpanuHerZKJ","object":"chat.completion.chunk","created":1686230903,"model":"gpt-4","choices":[{"index":0,"finish_reason":null,"delta":{"content":" error"}}],"usage":null}`);

    subject.next(`data: {"id":"chatcmpl-7P9yZS2gXZgAK6HCxXIpanuHerZKJ","object":"chat.completion.chunk","created":1686230903,"model":"gpt-4","choices":[{"index":0,"finish_reason":null,"delta":{"content":" message"}}],"usage":null}
    data: {"id":"chatcmpl-7P9yZS2gXZgAK6HCxXIpanuHerZKJ","object":"chat.completion.chunk","created":1686230903,"model":"gpt-4","choices":[{"index":0,"finish_reason":null,"delta":{"content":" "}}],"usage":null}
    data: {"id":"chatcmpl-7P9yZS2gXZgAK6HCxXIpanuHerZKJ","object":"chat.completion.chunk","created":1686230903,"model":"gpt-4","choices":[{"index":0,"finish_reason":null,"delta":{"content":"pq"}}],"usage":null}`);
    subject.next('[DONE]');
    subject.complete();

    let timesEmitted = 0;
    let chunks: CreateChatCompletionResponseChunk[] = [];

    await new Promise<void>((resolve, reject) => {
      observable.subscribe({
        next: (value) => {
          timesEmitted++;
          chunks = value;
        },
        complete: () => {
          resolve();
        },
        error: (err) => {
          reject(err);
        },
      });
    });

    expect(chunks.length).toBe(6);
    expect(chunks.length).toEqual(timesEmitted);

    expect(chunks[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        created: expect.any(Number),
        model: expect.any(String),
        usage: null,
        choices: expect.any(Object),
        object: expect.any(String),
      })
    );
  });
});
