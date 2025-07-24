/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpHandler } from '@kbn/core/public';
import { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';

export class KnowledgeBaseClient {
  constructor(private readonly fetch: HttpHandler, private readonly log: ToolingLog) {}
  async ensureInstalled(): Promise<void> {
    this.log.info('Checking whether the knowledge base is installed');

    const { ready } = await this.fetch<{ ready: boolean }>(
      '/internal/observability_ai_assistant/kb/status'
    );

    if (ready) {
      this.log.success('Knowledge base is already installed');
      return;
    }

    if (!ready) {
      this.log.info('Installing knowledge base');
    }

    await pRetry(
      async () => {
        const response = await this.fetch<{}>('/internal/observability_ai_assistant/kb/setup', {
          method: 'POST',
          query: {
            wait_until_complete: true,
          },
          body: JSON.stringify({
            query: {
              inference_id: '.elser-2-elasticsearch',
            },
          }),
        });

        this.log.info('Knowledge base is ready');
        return response;
      },
      { retries: 10 }
    );

    this.log.success('Knowledge base installed');
  }
}
