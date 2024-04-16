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
import { TOOL_USE_END, TOOL_USE_START } from '../simulate_function_calling/constants';
import { parseInlineFunctionCalls } from '../simulate_function_calling/parse_inline_function_calls';

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
          processBedrockStream(),
          parseInlineFunctionCalls({
            logger: getLoggerMock(),
          }),
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
          encode(TOOL_USE_START),
          encode('```json\n'),
          encode('{ "name": "my_tool", "input": { "my_param": "my_value" } }\n'),
          encode('```'),
          stop(TOOL_USE_END)
        ).pipe(
          processBedrockStream(),
          parseInlineFunctionCalls({
            logger: getLoggerMock(),
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
          encode(` my text${TOOL_USE_START.substring(0, 4)}`),
          encode(`${TOOL_USE_START.substring(4)}\n\`\`\`json\n{"name":`),
          encode(` "my_tool", "input`),
          encode(`": { "my_param": "my_value" } }\n`),
          encode('```'),
          stop(TOOL_USE_END)
        ).pipe(
          processBedrockStream(),
          parseInlineFunctionCalls({
            logger: getLoggerMock(),
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

  it('throws an error if the JSON cannot be parsed', async () => {
    async function fn() {
      return lastValueFrom(
        of(
          start(),
          encode(TOOL_USE_START),
          encode('```json\n'),
          encode('invalid json\n'),
          encode('```'),
          stop(TOOL_USE_END)
        ).pipe(
          processBedrockStream(),
          parseInlineFunctionCalls({
            logger: getLoggerMock(),
          }),
          rejectTokenCountEvents(),
          concatenateChatCompletionChunks()
        )
      );
    }

    await expect(fn).rejects.toThrowErrorMatchingInlineSnapshot(`"no elements in sequence"`);
  });

  it('successfully invokes a function without parameters', async () => {
    expect(
      await lastValueFrom(
        of(
          start(),
          encode(TOOL_USE_START),
          encode('```json\n'),
          encode('{ "name": "my_tool" }\n'),
          encode('```'),
          stop(TOOL_USE_END)
        ).pipe(
          processBedrockStream(),
          parseInlineFunctionCalls({
            logger: getLoggerMock(),
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
