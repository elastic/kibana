/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, from, map, switchMap, tap } from 'rxjs';
import { Readable } from 'stream';
import { parseSerdeChunkMessage } from './serde_utils';
import { Message, MessageRole } from '../../../../common/chat_complete';
import { createInferenceInternalError } from '../../../../common/errors';
import { ToolChoiceType, type ToolOptions } from '../../../../common/chat_complete/tools';
import { InferenceConnectorAdapter } from '../../types';
import type { BedRockMessage, BedrockToolChoice } from './types';
import {
  BedrockChunkMember,
  serdeEventstreamIntoObservable,
} from './serde_eventstream_into_observable';
import { processCompletionChunks } from './process_completion_chunks';
import { addNoToolUsageDirective } from './prompts';
import { ToolSchemaType } from '../../../../common/chat_complete/tool_schema';

export const bedrockClaudeAdapter: InferenceConnectorAdapter = {
  chatComplete: ({ executor, system, messages, toolChoice, tools }) => {
    const noToolUsage = toolChoice === ToolChoiceType.none;

    const subActionParams = {
      system: noToolUsage ? addNoToolUsageDirective(system) : system,
      messages: messagesToBedrock(messages),
      tools: noToolUsage ? [] : toolsToBedrock(tools, messages),
      toolChoice: toolChoiceToBedrock(toolChoice),
      temperature: 0,
      stopSequences: ['\n\nHuman:'],
    };

    return from(
      executor.invoke({
        subAction: 'invokeStream',
        subActionParams,
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
      map((message) => {
        return parseSerdeChunkMessage(message.chunk);
      }),
      processCompletionChunks()
    );
  },
};

const toolChoiceToBedrock = (
  toolChoice: ToolOptions['toolChoice']
): BedrockToolChoice | undefined => {
  if (toolChoice === ToolChoiceType.required) {
    return {
      type: 'any',
    };
  } else if (toolChoice === ToolChoiceType.auto) {
    return {
      type: 'auto',
    };
  } else if (typeof toolChoice === 'object') {
    return {
      type: 'tool',
      name: toolChoice.function,
    };
  }
  // ToolChoiceType.none is not supported by claude
  // we are adding a directive to the system instructions instead in that case.
  return undefined;
};

const toolsToBedrock = (tools: ToolOptions['tools'], messages: Message[]) => {
  function walkSchema<T extends ToolSchemaType>(schemaPart: T): T {
    if (schemaPart.type === 'object' && schemaPart.properties) {
      return {
        ...schemaPart,
        properties: Object.fromEntries(
          Object.entries(schemaPart.properties).map(([key, childSchemaPart]) => {
            return [key, walkSchema(childSchemaPart)];
          })
        ),
      };
    }

    if (schemaPart.type === 'array') {
      return {
        ...schemaPart,
        // Claude is prone to ignoring the "array" part of an array type
        description: schemaPart.description + '. Must be provided as a JSON array',
        items: walkSchema(schemaPart.items),
      };
    }

    return schemaPart;
  }

  if (tools) {
    return Object.entries(tools).map(([toolName, toolDef]) => {
      return {
        name: toolName,
        description: toolDef.description,
        input_schema: walkSchema(
          toolDef.schema ?? {
            type: 'object' as const,
            properties: {},
          }
        ),
      };
    });
  }

  const hasToolUse = messages.filter(
    (message) =>
      message.role === MessageRole.Tool ||
      (message.role === MessageRole.Assistant && message.toolCalls?.length)
  );

  if (hasToolUse) {
    return [
      {
        name: 'do_not_call_this_tool',
        description: 'Do not call this tool, it is strictly forbidden',
        input_schema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }
};

const messagesToBedrock = (messages: Message[]): BedRockMessage[] => {
  return messages.map<BedRockMessage>((message) => {
    switch (message.role) {
      case MessageRole.User:
        return {
          role: 'user' as const,
          rawContent: [{ type: 'text' as const, text: message.content }],
        };
      case MessageRole.Assistant:
        return {
          role: 'assistant' as const,
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
