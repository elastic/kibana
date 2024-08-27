/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, from, switchMap, tap } from 'rxjs';
import { Readable } from 'stream';
import type { InvokeAIActionParams } from '@kbn/stack-connectors-plugin/common/bedrock/types';
import { Message, MessageRole } from '../../../../common/chat_complete';
import type { ToolOptions } from '../../../../common/chat_complete/tools';
import { createInferenceInternalError } from '../../../../common/errors';
import { InferenceConnectorAdapter } from '../../types';
import type { BedRockMessage } from './types';
import {
  serdeEventstreamIntoObservable,
  BedrockChunkMember,
} from './serde_eventstream_into_observable';
import { processBedrockStream } from './process_bedrock_stream';

export const bedrockClaudeAdapter: InferenceConnectorAdapter = {
  chatComplete: ({ executor, system, messages, toolChoice, tools }) => {
    // TODO: toolChoice
    const connectorInvokeRequest: InvokeAIActionParams = {
      system,
      messages: messagesToBedrock(messages),
      tools: toolsToBedrock(tools),
      temperature: 0,
      stopSequences: ['\n\nHuman:'],
    };

    return from(
      executor.invoke({
        subAction: 'invokeStream',
        subActionParams: connectorInvokeRequest,
      })
    ).pipe(
      switchMap((response) => {
        const readable = response.data as Readable;
        return serdeEventstreamIntoObservable(readable);
      }),
      tap((eventData) => {
        if ('modelStreamErrorException' in eventData) {
          throw createInferenceInternalError(eventData.modelStreamErrorException.originalMessage);
        }
      }),
      filter((value): value is BedrockChunkMember => {
        return 'chunk' in value && value.chunk?.headers?.[':event-type']?.value === 'chunk';
      }),
      processBedrockStream()
    );
  },
};

const toolsToBedrock = (tools: ToolOptions['tools']) => {
  return tools
    ? Object.entries(tools).map(([toolName, toolDef]) => {
        return {
          name: toolName,
          description: toolDef.description,
          input_schema: toolDef.schema ?? {
            type: 'object' as const,
            properties: {},
          },
        };
      })
    : undefined;
};

const messagesToBedrock = (messages: Message[]): BedRockMessage[] => {
  return messages.map<BedRockMessage>((message) => {
    switch (message.role) {
      case MessageRole.User:
        return {
          role: 'user' as const,
          // content: message.content,
          rawContent: [{ type: 'text' as const, text: message.content }],
        };
      case MessageRole.Assistant:
        return {
          role: 'assistant' as const,
          // content: message.content,
          rawContent: [
            ...(message.content ? [{ type: 'text' as const, text: message.content }] : []),
            ...(message.toolCalls
              ? message.toolCalls.map((toolCall) => {
                  return {
                    type: 'tool_use' as const,
                    id: toolCall.toolCallId,
                    name: toolCall.function.name,
                    input: ('arguments' in toolCall.function
                      ? toolCall.function.arguments
                      : {}) as Record<string, unknown>,
                  };
                })
              : []),
          ],
        };
      case MessageRole.Tool:
        return {
          role: 'user' as const,
          rawContent: [
            {
              type: 'tool_result' as const,
              tool_use_id: message.toolCallId,
              content: JSON.stringify(message.response),
            },
          ],
        };
    }
  });
};
