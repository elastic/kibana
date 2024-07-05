/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CoreRequestHandlerContext } from '@kbn/core/server';
import { aiAssistantLogsIndexPattern } from '@kbn/observability-ai-assistant-plugin/server';
import { fetchLogRateAnalysis } from '@kbn/aiops-log-rate-analysis/queries/fetch_log_rate_analysis';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export async function getLogRateAnalysis({
  apmEventClient,
  esClient,
  coreContext,
  arguments: args,
}: {
  apmEventClient: APMEventClient;
  esClient: ElasticsearchClient;
  coreContext: Pick<CoreRequestHandlerContext, 'uiSettings'>;
  arguments: {
    start: string;
    end: string;
    entities: {
      'service.name'?: string;
      'host.name'?: string;
      'container.id'?: string;
      'kubernetes.pod.name'?: string;
    };
  };
}): ReturnType<typeof fetchLogRateAnalysis> {
  const index = await coreContext.uiSettings.client.get<string>(aiAssistantLogsIndexPattern);
  return await fetchLogRateAnalysis({
    esClient,
    arguments: {
      index,
      start: args.start,
      end: args.end,
      timefield: '@timestamp',
    },
  });
}
