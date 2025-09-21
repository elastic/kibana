/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import type { ToolingLog } from '@kbn/tooling-log';
import type { EsClient } from '@kbn/scout-oblt';

export class ConversationsClient {
  constructor(private readonly log: ToolingLog, private readonly esClient: EsClient) {}

  async clear() {
    this.log.info('Clearing conversations');

    return pRetry(
      () => {
        return this.esClient.deleteByQuery({
          index: '.kibana-observability-ai-assistant-conversations-*',
          conflicts: 'proceed',
          query: { match_all: {} },
          refresh: true,
        });
      },
      { retries: 5 }
    );
  }
}
