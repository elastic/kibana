/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';

export function createToolCallMessage(
  toolName: string,
  toolArg: Record<string, any>
): Omit<ChatCompletionMessage, 'refusal'> {
  return {
    role: 'assistant' as const,
    content: '',
    tool_calls: [
      {
        function: {
          name: toolName,
          arguments: JSON.stringify(toolArg),
        },
        id: `call_${uuidv4()}`,
        type: 'function',
      },
    ],
  };
}
