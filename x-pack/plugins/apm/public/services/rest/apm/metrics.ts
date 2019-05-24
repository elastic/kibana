/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsChartsByAgentAPIResponse } from '../../../../server/lib/metrics/get_metrics_chart_data_by_agent';
import { callApi } from '../callApi';
import { getUiFiltersES } from '../../ui_filters/get_ui_filters_es';
import { UIFilters } from '../../../../typings/ui-filters';

export async function loadMetricsChartData({
  serviceName,
  agentName,
  start,
  end,
  uiFilters
}: {
  serviceName: string;
  agentName: string;
  start: string;
  end: string;
  uiFilters: UIFilters;
}) {
  return callApi<MetricsChartsByAgentAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/metrics/charts`,
    query: {
      start,
      end,
      agentName,
      uiFiltersES: await getUiFiltersES(uiFilters)
    }
  });
}
