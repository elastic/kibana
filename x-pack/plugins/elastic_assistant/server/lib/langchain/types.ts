/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatCompletionContentPart,
  ChatCompletionCreateParamsNonStreaming,
} from 'openai/resources/chat/completions';
import { ExecuteConnectorResponse } from '@kbn/elastic-assistant-common';

export type ResponseBody = ExecuteConnectorResponse;

export interface InvokeAIActionParamsSchema {
  messages: Array<{
    role: string;
    content: string | ChatCompletionContentPart[];
    name?: string;
    function_call?: {
      arguments: string;
      name: string;
    };
    tool_calls?: Array<{
      id: string;

      function: {
        arguments: string;
        name: string;
      };

      type: string;
    }>;
    tool_call_id?: string;
  }>;
  model?: ChatCompletionCreateParamsNonStreaming['model'];
  n?: ChatCompletionCreateParamsNonStreaming['n'];
  stop?: ChatCompletionCreateParamsNonStreaming['stop'];
  temperature?: ChatCompletionCreateParamsNonStreaming['temperature'];
  functions?: ChatCompletionCreateParamsNonStreaming['functions'];
  signal?: AbortSignal;
}
