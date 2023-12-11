/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { KibanaRequest } from '@kbn/core-http-server';
import { DynamicTool, Tool } from 'langchain/tools';

import { getAlertsCountQuery } from './get_alert_counts_query';
import { requestHasRequiredAnonymizationParams } from '../../helpers';
import type { RequestBody } from '../../types';

export const ALERT_COUNTS_TOOL_DESCRIPTION =
  'Call this for the counts of last 24 hours of open alerts in the environment, grouped by their severity';

export const getAlertCountsTool = ({
  alertsIndexPattern,
  esClient,
  replacements,
  request,
}: {
  alertsIndexPattern?: string;
  esClient: ElasticsearchClient;
  replacements?: Record<string, string>;
  request: KibanaRequest<unknown, unknown, RequestBody>;
}): Tool | null => {
  if (!requestHasRequiredAnonymizationParams(request) || alertsIndexPattern == null) {
    return null;
  }

  return new DynamicTool({
    name: 'alert-counts',
    description: ALERT_COUNTS_TOOL_DESCRIPTION,
    func: async () => {
      const query = getAlertsCountQuery(alertsIndexPattern);

      const result = await esClient.search<SearchResponse>(query);

      return JSON.stringify(result);
    },
    tags: ['alerts', 'alerts-count'],
  });
};
