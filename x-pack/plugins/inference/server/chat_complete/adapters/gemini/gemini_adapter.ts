/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Gemini from '@google/generative-ai';
import { from, map, switchMap } from 'rxjs';
import { Readable } from 'stream';
import type { InferenceConnectorAdapter } from '../../types';
import { Message, MessageRole } from '../../../../common/chat_complete';
import type { ToolOptions, ToolChoice } from '../../../../common/chat_complete/tools';
import type { ToolSchema, ToolSchemaType } from '../../../../common/chat_complete/tool_schema';
import { eventSourceStreamIntoObservable } from '../../../util/event_source_stream_into_observable';
import { processVertexStream } from './process_vertex_stream';
import type { GenerateContentResponseChunk } from './types';

/**
 * We need to use the connector's format, not directly Gemini's...
 *
 * In practice, either use `content` that will be automatically converted to parts,
 * or use `parts` directly for advanced usages such as tool response.
 *
 * See x-pack/plugins/stack_connectors/server/connector_types/gemini/gemini.ts
 */
interface GeminiMessage {
  role: 'assistant' | 'user';
  content?: string;
  parts?: Gemini.Part[];
}

export const geminiAdapter: InferenceConnectorAdapter = {
  chatComplete: ({ executor, system, messages, toolChoice, tools }) => {
    // TODO: toolChoice
    return from(
      executor.invoke({
        subAction: 'invokeStream',
        subActionParams: {
          messages: messagesToGemini({ system, messages, toolChoice }),
          tools: toolsToGemini(tools),
          temperature: 0,
          stopSequences: ['\n\nHuman:'],
        },
      })
    ).pipe(
      switchMap((response) => {
        const readable = response.data as Readable;
        return eventSourceStreamIntoObservable(readable);
      }),
      map((line) => {
        return JSON.parse(line) as GenerateContentResponseChunk;
      }),
      processVertexStream()
    );
  },
};

function toolsToGemini(tools: ToolOptions['tools']): Gemini.Tool[] {
  return [
    {
      functionDeclarations: Object.entries(tools ?? {}).map(
        ([toolName, { description, schema }]) => {
          return {
            name: toolName,
            description,
            parameters: schema
              ? toolSchemaToGemini({ schema })
              : {
                  type: Gemini.FunctionDeclarationSchemaType.OBJECT,
                  properties: {},
                },
          };
        }
      ),
    },
  ];
}

function toolSchemaToGemini({ schema }: { schema: ToolSchema }): Gemini.FunctionDeclarationSchema {
  const convertSchemaType = ({
    def,
  }: {
    def: ToolSchemaType;
  }): Gemini.FunctionDeclarationSchemaProperty => {
    switch (def.type) {
      case 'array':
        return {
          type: Gemini.FunctionDeclarationSchemaType.ARRAY,
          description: def.description,
          items: convertSchemaType({ def: def.items }) as Gemini.FunctionDeclarationSchema,
        };
      case 'object':
        return {
          type: Gemini.FunctionDeclarationSchemaType.OBJECT,
          description: def.description,
          required: def.required as string[],
          properties: Object.entries(def.properties).reduce<
            Record<string, Gemini.FunctionDeclarationSchema>
          >((properties, [key, prop]) => {
            properties[key] = convertSchemaType({ def: prop }) as Gemini.FunctionDeclarationSchema;
            return properties;
          }, {}),
        };
      case 'string':
        return {
          type: Gemini.FunctionDeclarationSchemaType.STRING,
          description: def.description,
          enum: def.enum ? (def.enum as string[]) : def.const ? [def.const] : undefined,
        };
      case 'boolean':
        return {
          type: Gemini.FunctionDeclarationSchemaType.BOOLEAN,
          description: def.description,
          enum: def.enum ? (def.enum as string[]) : def.const ? [def.const] : undefined,
        };
      case 'number':
        return {
          type: Gemini.FunctionDeclarationSchemaType.NUMBER,
          description: def.description,
          enum: def.enum ? (def.enum as string[]) : def.const ? [def.const] : undefined,
        };
      default:
        throw new Error(`Error converting Invalid parameter type: ${def}`);
    }
  };

  return {
    type: Gemini.FunctionDeclarationSchemaType.OBJECT,
    required: schema.required as string[],
    properties: Object.entries(schema.properties).reduce<
      Record<string, Gemini.FunctionDeclarationSchemaProperty>
    >((properties, [key, def]) => {
      properties[key] = convertSchemaType({ def });
      return properties;
    }, {}),
  };
}

function messagesToGemini({
  messages,
  system,
  toolChoice,
}: {
  messages: Message[];
  system?: string;
  toolChoice?: ToolChoice;
}): GeminiMessage[] {
  // systemInstruction is not supported on all gemini versions
  // so for now we just always use the old trick of user message + assistant acknowledge.
  const systemMessages: GeminiMessage[] | undefined = system
    ? [
        { role: 'user', content: system },
        { role: 'assistant', content: 'Understood.' },
      ]
    : undefined;

  return [
    ...(systemMessages ? [...systemMessages] : []),
    ...messages.map(messageToGeminiFormat()),
    ...(toolChoice
      ? [
          {
            role: 'user' as const,
            content: `Important: You MUST call the '${toolChoice}' tool to answer the question from the previous message.
            You should NOT respond with text, you are ONLY allowed to call the '${toolChoice}' tool`,
          },
        ]
      : []),
  ];
}

function messageToGeminiFormat() {
  return (message: Message): GeminiMessage => {
    const role = message.role;

    switch (role) {
      case MessageRole.Assistant:
        const assistantMessage: GeminiMessage = {
          role: 'assistant',
          parts: [
            ...(message.content ? [{ text: message.content }] : []),
            ...(message.toolCalls ?? []).map((toolCall) => {
              return {
                functionCall: {
                  name: toolCall.function.name,
                  args: ('arguments' in toolCall.function
                    ? toolCall.function.arguments
                    : {}) as object,
                },
              };
            }),
          ],
        };
        return assistantMessage;

      case MessageRole.User:
        const userMessage: GeminiMessage = {
          role: 'user',
          content: message.content,
        };
        return userMessage;

      case MessageRole.Tool:
        // tool responses are provided as user messages
        const toolMessage: GeminiMessage = {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: message.toolCallId,
                response: message.response as object,
              },
            },
          ],
        };
        return toolMessage;
    }
  };
}
