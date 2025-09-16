/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type http from 'http';
import type { ChatCompletionMessage } from 'openai/resources';

export type HttpRequest = http.IncomingMessage;
export type HttpResponse = http.ServerResponse<http.IncomingMessage>;

export type LLMMessage = string[] | ToolMessage | string | undefined;

export type ToolMessage = Omit<ChatCompletionMessage, 'refusal'>;
