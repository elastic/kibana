/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CoreRequestHandlerContext } from '@kbn/core/server';
import { aiAssistantLogsIndexPattern } from '@kbn/observability-ai-assistant-plugin/server';
import { fetchLogRateAnalysisForAlert } from '@kbn/aiops-log-rate-analysis/queries/fetch_log_rate_analysis_for_alert';
import { PROCESSOR_EVENT } from '../../../../common/es_fields/apm';
import { getShouldMatchOrNotExistFilter } from '../utils/get_should_match_or_not_exist_filter';

/**
 * Runs log rate analysis data on an index given some alert metadata.
 */
export async function getLogRateAnalysisForAlert({
  esClient,
  coreContext,
  arguments: args,
}: {
  esClient: ElasticsearchClient;
  coreContext: Pick<CoreRequestHandlerContext, 'uiSettings'>;
  arguments: {
    alertStartedAt: string;
    alertRuleParameterTimeSize?: number;
    alertRuleParameterTimeUnit?: string;
    entities: {
      'service.name'?: string;
      'host.name'?: string;
      'container.id'?: string;
      'kubernetes.pod.name'?: string;
    };
  };
}): ReturnType<typeof fetchLogRateAnalysisForAlert> {
  const index = await coreContext.uiSettings.client.get<string>(aiAssistantLogsIndexPattern);

  const keyValueFilters = getShouldMatchOrNotExistFilter(
    Object.entries(args.entities).map(([key, value]) => ({ field: key, value }))
  );

  const searchQuery = {
    bool: {
      must_not: [
        // exclude APM errors
        { term: { [PROCESSOR_EVENT]: 'error' } },
      ],
      filter: [...keyValueFilters],
    },
  };

  return fetchLogRateAnalysisForAlert({
    esClient,
    arguments: {
      index,
      alertStartedAt: args.alertStartedAt,
      alertRuleParameterTimeSize: args.alertRuleParameterTimeSize,
      alertRuleParameterTimeUnit: args.alertRuleParameterTimeUnit,
      searchQuery,
    },
  });
}
