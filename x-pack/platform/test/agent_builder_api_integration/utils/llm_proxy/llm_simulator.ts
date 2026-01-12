/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import type { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import type { ToolingLog } from '@kbn/tooling-log';
import { createOpenAiChunk } from './create_openai_chunk';
import type { HttpResponse, ToolMessage } from './types';

/**
 * Formats a chunk for Server-Sent Events (SSE)
 */
export function sseEvent(chunk: unknown) {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

export class LlmSimulator {
  constructor(
    public readonly requestBody: ChatCompletionStreamParams,
    private readonly response: HttpResponse,
    private readonly log: ToolingLog,
    private readonly name: string
  ) {}

  async writeChunk(msg: string | ToolMessage): Promise<void> {
    this.status(200);
    const chunk = createOpenAiChunk(msg);
    return this.write(sseEvent(chunk));
  }

  async complete(): Promise<void> {
    this.log.debug(`Completed intercept for "${this.name}"`);
    await this.write('data: [DONE]\n\n');
    await this.end();
  }

  async writeErrorChunk(code: number, error: Record<string, unknown>): Promise<void> {
    this.status(code);
    await this.write(sseEvent(error));
    await this.end();
  }

  status = once((code: number) => {
    this.response.writeHead(code, {
      'Elastic-Interceptor': this.name.replace(/[^\x20-\x7E]/g, ' '), // Keeps only alphanumeric characters and spaces
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
  });

  private write(chunk: string): Promise<void> {
    return new Promise<void>((resolve) => this.response.write(chunk, () => resolve()));
  }

  private end(): Promise<void> {
    return new Promise<void>((resolve) => this.response.end(resolve));
  }
}
