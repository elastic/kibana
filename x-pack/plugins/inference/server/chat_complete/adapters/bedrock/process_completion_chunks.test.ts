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
import { processCompletionChunks } from './process_bedrock_stream';
import { MessageRole } from '../../../../../common';
import { TOOL_USE_END, TOOL_USE_START } from '../simulate_function_calling/constants';
import { parseInlineFunctionCalls } from '../simulate_function_calling/parse_inline_function_calls';
import { withoutTokenCountEvents } from '../../../../../common/utils/without_token_count_events';

/*
*** {"type":"message_start","message":{"id":"msg_bdrk_012EMKX9CWPtpmbxXLG51z2t","type":"message","role":"assistant","model":"claude-3-sonnet-20240229","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":365,"output_tokens":1}}}
*** {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_bdrk_018QcdZZxZqKuheNsHQpbUjG","name":"getOrderById","input":{}}}
*** {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":""}}
*** {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\"orderId"}}
*** {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"\": \"XF"}}
*** {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"GHJ5678\"}"}}
*** {"type":"content_block_stop","index":0}
*** {"type":"message_delta","delta":{"stop_reason":"tool_use","stop_sequence":null},"usage":{"output_tokens":60}}
*** {"type":"message_stop","amazon-bedrock-invocationMetrics":{"inputTokenCount":365,"outputTokenCount":41,"invocationLatency":1181,"firstByteLatency":366}}
 */

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
          processCompletionChunks(),
          parseInlineFunctionCalls({
            logger: getLoggerMock(),
          }),
          withoutTokenCountEvents(),
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
});
