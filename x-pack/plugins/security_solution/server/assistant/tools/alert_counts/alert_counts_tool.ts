/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { DynamicTool } from 'langchain/tools';

import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { getAlertsCountQuery } from './get_alert_counts_query';
import { APP_UI_ID } from '../../../../common';

export interface AlertCountsToolParams extends AssistantToolParams {
  alertsIndexPattern: string;
}
export const ALERT_COUNTS_TOOL_DESCRIPTION =
  'Call this for the counts of last 24 hours of open and acknowledged alerts in the environment, grouped by their severity and workflow status.';

export const ALERT_COUNTS_TOOL: AssistantTool = {
  id: 'alert-counts-tool',
  name: 'AlertCountsTool',
  description: ALERT_COUNTS_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is AlertCountsToolParams => {
    const { request, alertsIndexPattern } = params;
    return requestHasRequiredAnonymizationParams(request) && alertsIndexPattern != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;
    const { alertsIndexPattern, esClient } = params as AlertCountsToolParams;
    return new DynamicTool({
      name: 'AlertCountsTool',
      description: ALERT_COUNTS_TOOL_DESCRIPTION,
      func: async () => {
        const query = getAlertsCountQuery(alertsIndexPattern);

        const result = await esClient.search<SearchResponse>(query);

        return JSON.stringify(result);
      },
      tags: ['alerts', 'alerts-count'],
    });
  },
};
