/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';

export interface AiInsightResponse {
  summary: string;
  context: string;
}

export interface AlertInsightParams {
  alertId: string;
}
export interface ErrorInsightParams {
  errorId: string;
  serviceName: string;
  start: string;
  end: string;
  environment?: string;
}

export interface LogInsightParams {
  index: string;
  id: string;
}

const EVENT_PREFIX = 'event: ';
const DATA_PREFIX = 'data: ';

/**
 * The AI insight endpoints return SSE (Server-Sent Events) streams.
 * This parses the raw SSE text into the summary and context fields.
 */
function parseSseResponse(raw: unknown): AiInsightResponse {
  const text = typeof raw === 'string' ? raw : String(raw);

  const events = text
    .split(/\n\n/)
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim());
      const eventLine = lines.find((line) => line.startsWith(EVENT_PREFIX));
      const dataLine = lines.find((line) => line.startsWith(DATA_PREFIX));

      if (!eventLine || !dataLine) return null;

      try {
        return {
          type: eventLine.slice(EVENT_PREFIX.length).trim(),
          data: JSON.parse(dataLine.slice(DATA_PREFIX.length)) as Record<string, unknown>,
        };
      } catch {
        return null;
      }
    })
    .filter((event): event is { type: string; data: Record<string, unknown> } => event !== null);

  const contextEvent = events.find((e) => e.type === 'context');
  const messageEvent = events.find((e) => e.type === 'chatCompletionMessage');

  const summary = (messageEvent?.data?.content as string) || '';
  const context = (contextEvent?.data?.context as string) || '';

  if (!summary) {
    const chunks = events
      .filter((e) => e.type === 'chatCompletionChunk')
      .map((e) => (e.data?.content as string) || '')
      .join('');
    return { summary: chunks, context };
  }

  return { summary, context };
}

export class AiInsightClient {
  constructor(private readonly fetch: HttpHandler) {}

  async getAlertInsight(params: AlertInsightParams): Promise<AiInsightResponse> {
    const raw = await this.fetch('/internal/observability_agent_builder/ai_insights/alert', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return parseSseResponse(raw);
  }

  async getErrorInsight(params: ErrorInsightParams): Promise<AiInsightResponse> {
    const raw = await this.fetch('/internal/observability_agent_builder/ai_insights/error', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return parseSseResponse(raw);
  }

  async getLogInsight(params: LogInsightParams): Promise<AiInsightResponse> {
    const raw = await this.fetch('/internal/observability_agent_builder/ai_insights/log', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return parseSseResponse(raw);
  }
}
