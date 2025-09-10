/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-oblt';
import pRetry from 'p-retry';

export async function clearConversations(esClient: EsClient) {
  const CONV_INDEX = '.kibana-observability-ai-assistant-conversations-*';
  return pRetry(
    () => {
      return esClient.deleteByQuery({
        index: CONV_INDEX,
        conflicts: 'proceed',
        query: { match_all: {} },
        refresh: true,
      });
    },
    { retries: 5 }
  );
}
