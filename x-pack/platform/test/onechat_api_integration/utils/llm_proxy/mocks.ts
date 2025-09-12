/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ToolMessage } from '.';

export function toolCallMock(toolName: string, toolArg: Record<string, any>): ToolMessage {
  return {
    role: 'assistant' as const,
    content: '',
    tool_call_id: uuidv4().slice(0, 8),
    tool_calls: [
      {
        function: {
          name: toolName,
          arguments: JSON.stringify(toolArg),
        },
        index: 0,
        id: `call_${uuidv4()}`,
        type: 'function',
      },
    ],
  } as unknown as ToolMessage;
}

export function getToolCallId(message: any): string {
  return message?.tool_call_id ?? message?.tool_calls?.[0]?.id;
}
