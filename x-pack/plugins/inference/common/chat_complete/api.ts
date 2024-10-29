/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { ToolOptions } from './tools';
import type { Message } from './messages';
import type { ChatCompletionEvent } from './events';

/**
 * Request a completion from the LLM based on a prompt or conversation.
 *
 * @param {string} options.connectorId The ID of the connector to use
 * @param {string} [options.system] A system message that defines the behavior of the LLM.
 * @param {Message[]} options.message A list of messages that make up the conversation to be completed.
 * @param {ToolChoice} [options.toolChoice] Force the LLM to call a (specific) tool, or no tool
 * @param {Record<string, ToolDefinition>} [options.tools] A map of tools that can be called by the LLM
 */
export type ChatCompleteAPI = <TToolOptions extends ToolOptions = ToolOptions>(
  options: {
    connectorId: string;
    system?: string;
    messages: Message[];
    functionCalling?: FunctionCallingMode;
  } & TToolOptions
) => ChatCompletionResponse<TToolOptions>;

export type ChatCompletionResponse<TToolOptions extends ToolOptions = ToolOptions> = Observable<
  ChatCompletionEvent<TToolOptions>
>;

export type FunctionCallingMode = 'native' | 'simulated';
