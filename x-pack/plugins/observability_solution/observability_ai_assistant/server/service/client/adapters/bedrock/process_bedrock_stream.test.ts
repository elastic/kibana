/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromUtf8 } from '@smithy/util-utf8';
import { lastValueFrom, of } from 'rxjs';
import { Logger } from '@kbn/logging';
import { concatenateChatCompletionChunks } from '../../../../../common/utils/concatenate_chat_completion_chunks';
import { processBedrockStream } from './process_bedrock_stream';
import { MessageRole } from '../../../../../common';
import { rejectTokenCountEvents } from '../../../util/reject_token_count_events';

describe('processBedrockStream', () => {
  const encodeChunk = (body: unknown) => {
    return {
      chunk: {
        headers: {
          '::event-type': { value: 'chunk', type: 'uuid' as const },
        },
        body: fromUtf8(
          JSON.stringify({
            bytes: Buffer.from(JSON.stringify(body), 'utf-8').toString('base64'),
          })
        ),
      },
    };
  };

  const encode = (completion: string) => {
    return encodeChunk({ type: 'content_block_delta', delta: { type: 'text', text: completion } });
  };

  const start = () => {
    return encodeChunk({ type: 'message_start' });
  };

  const stop = (stopSequence?: string) => {
    return encodeChunk({
      type: 'message_delta',
      delta: {
        stop_sequence: stopSequence || null,
      },
    });
  };

  function getLoggerMock() {
    return {
      debug: jest.fn(),
    } as unknown as Logger;
  }

  it('parses normal text messages', async () => {
    expect(
      await lastValueFrom(
        of(
          start(),
          encode('This'),
          encode(' is'),
          encode(' some normal'),
          encode(' text'),
          stop()
        ).pipe(
          processBedrockStream({ logger: getLoggerMock() }),
          rejectTokenCountEvents(),
          concatenateChatCompletionChunks()
        )
      )
    ).toEqual({
      message: {
        content: 'This is some normal text',
        function_call: {
          arguments: '',
          name: '',
          trigger: MessageRole.Assistant,
        },
        role: MessageRole.Assistant,
      },
    });
  });

  it('parses function calls when no text is given', async () => {
    expect(
      await lastValueFrom(
        of(
          start(),
          encode('<function_calls><invoke'),
          encode('><tool_name>my_tool</tool_name><parameters'),
          encode('><my_param>my_value</my_param'),
          encode('></parameters></invoke>'),
          stop('</function_calls>')
        ).pipe(
          processBedrockStream({
            logger: getLoggerMock(),
            functions: [
              {
                name: 'my_tool',
                description: '',
                parameters: {
                  properties: {
                    my_param: {
                      type: 'string',
                    },
                  },
                },
              },
            ],
          }),
          rejectTokenCountEvents(),
          concatenateChatCompletionChunks()
        )
      )
    ).toEqual({
      message: {
        content: '',
        function_call: {
          arguments: JSON.stringify({ my_param: 'my_value' }),
          name: 'my_tool',
          trigger: MessageRole.Assistant,
        },
        role: MessageRole.Assistant,
      },
    });
  });

  it('parses function calls when they are prefaced by text', async () => {
    expect(
      await lastValueFrom(
        of(
          start(),
          encode('This is'),
          encode(' my text\n<function_calls><invoke'),
          encode('><tool_name>my_tool</tool_name><parameters'),
          encode('><my_param>my_value</my_param'),
          encode('></parameters></invoke'),
          encode('>'),
          stop('</function_calls>')
        ).pipe(
          processBedrockStream({
            logger: getLoggerMock(),
            functions: [
              {
                name: 'my_tool',
                description: '',
                parameters: {
                  properties: {
                    my_param: {
                      type: 'string',
                    },
                  },
                },
              },
            ],
          }),
          rejectTokenCountEvents(),
          concatenateChatCompletionChunks()
        )
      )
    ).toEqual({
      message: {
        content: 'This is my text',
        function_call: {
          arguments: JSON.stringify({ my_param: 'my_value' }),
          name: 'my_tool',
          trigger: MessageRole.Assistant,
        },
        role: MessageRole.Assistant,
      },
    });
  });

  it('throws an error if the XML cannot be parsed', async () => {
    async function fn() {
      return lastValueFrom(
        of(
          start(),
          encode('<function_calls><invoke'),
          encode('><tool_name>my_tool</tool><parameters'),
          encode('><my_param>my_value</my_param'),
          encode('></parameters></invoke'),
          encode('>'),
          stop('</function_calls>')
        ).pipe(
          processBedrockStream({
            logger: getLoggerMock(),
            functions: [
              {
                name: 'my_tool',
                description: '',
                parameters: {
                  properties: {
                    my_param: {
                      type: 'string',
                    },
                  },
                },
              },
            ],
          }),
          rejectTokenCountEvents(),
          concatenateChatCompletionChunks()
        )
      );
    }

    await expect(fn).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Unexpected close tag
      Line: 0
      Column: 49
      Char: >"
    `);
  });

  it('throws an error if the function does not exist', async () => {
    expect(
      async () =>
        await lastValueFrom(
          of(
            start(),
            encode('<function_calls><invoke'),
            encode('><tool_name>my_other_tool</tool_name><parameters'),
            encode('><my_param>my_value</my_param'),
            encode('></parameters></invoke'),
            encode('>'),
            stop('</function_calls>')
          ).pipe(
            processBedrockStream({
              logger: getLoggerMock(),
              functions: [
                {
                  name: 'my_tool',
                  description: '',
                  parameters: {
                    properties: {
                      my_param: {
                        type: 'string',
                      },
                    },
                  },
                },
              ],
            }),
            rejectTokenCountEvents(),
            concatenateChatCompletionChunks()
          )
        )
    ).rejects.toThrowError(
      'Function definition for my_other_tool not found. Available are: my_tool'
    );
  });

  it('successfully invokes a function without parameters', async () => {
    expect(
      await lastValueFrom(
        of(
          encode('<function_calls><invoke'),
          encode('><tool_name>my_tool</tool_name><parameters'),
          encode('></parameters></invoke'),
          encode('>'),
          stop('</function_calls>')
        ).pipe(
          processBedrockStream({
            logger: getLoggerMock(),
            functions: [
              {
                name: 'my_tool',
                description: '',
                parameters: {
                  properties: {
                    my_param: {
                      type: 'string',
                    },
                  },
                },
              },
            ],
          }),
          rejectTokenCountEvents(),
          concatenateChatCompletionChunks()
        )
      )
    ).toEqual({
      message: {
        content: '',
        function_call: {
          arguments: '{}',
          name: 'my_tool',
          trigger: MessageRole.Assistant,
        },
        role: MessageRole.Assistant,
      },
    });
  });
});
