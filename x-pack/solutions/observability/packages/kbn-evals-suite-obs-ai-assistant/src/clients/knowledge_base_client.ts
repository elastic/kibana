/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { EsClient } from '@kbn/scout-oblt';

export class KnowledgeBaseClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly esClient: EsClient
  ) {}

  async ensureInstalled(): Promise<void> {
    this.log.info('Checking whether the knowledge base is installed');

    const { ready } = await this.fetch<{ ready: boolean }>(
      '/internal/observability_ai_assistant/kb/status'
    );

    if (ready) {
      this.log.success('Knowledge base is already installed');
      return;
    }

    this.log.info('Installing knowledge base');

    await pRetry(
      async () => {
        this.log.info('Waiting for knowledge base to be ready...');
        const response = await this.fetch<{}>('/internal/observability_ai_assistant/kb/setup', {
          method: 'POST',
          query: {
            inference_id: '.elser-2-elasticsearch',
            wait_until_complete: true,
          },
          body: JSON.stringify({}),
        });

        this.log.info('Knowledge base is ready');
        return response;
      },
      { retries: 10 }
    );

    this.log.success('Knowledge base installed');
  }

  async importEntries({ entries }: { entries: unknown[] }): Promise<void> {
    await this.fetch<{}>('/internal/observability_ai_assistant/kb/entries/import', {
      method: 'POST',
      body: JSON.stringify({ entries }),
    });
  }

  async clear() {
    return pRetry(
      () => {
        return this.esClient.deleteByQuery({
          index: '.kibana-observability-ai-assistant-kb-*',
          conflicts: 'proceed',
          query: { match_all: {} },
          refresh: true,
        });
      },
      { retries: 5 }
    );
  }
}
