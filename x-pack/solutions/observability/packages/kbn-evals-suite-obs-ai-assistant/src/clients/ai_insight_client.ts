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

export class AiInsightClient {
  constructor(private readonly fetch: HttpHandler) {}

  async getAlertInsight(params: AlertInsightParams): Promise<AiInsightResponse> {
    return this.fetch('/internal/observability_agent_builder/ai_insights/alert', {
      method: 'POST',
      body: JSON.stringify(params),
    }) as Promise<AiInsightResponse>;
  }

  async getErrorInsight(params: ErrorInsightParams): Promise<AiInsightResponse> {
    return this.fetch('/internal/observability_agent_builder/ai_insights/error', {
      method: 'POST',
      body: JSON.stringify(params),
    }) as Promise<AiInsightResponse>;
  }
}
