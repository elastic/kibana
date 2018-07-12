/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraBackendFrameworkAdapter } from '../lib/infra_types';
import { initAdjacentLogEntriesRoutes } from './adjacent_log_entries';
import { initAdjacentSearchResultsRoutes } from './adjacent_search_results';
import { initContainedSearchResultsRoutes } from './contained_search_results';
import { initLatestLogEntriesRoutes } from './latest_log_entries';
import { initLogSummaryRoutes } from './log_summary';
import { initSearchSummaryRoutes } from './search_summary';

export const initLegacyLoggingRoutes = (framework: InfraBackendFrameworkAdapter) => {
  initAdjacentLogEntriesRoutes(framework);
  initLatestLogEntriesRoutes(framework);
  initLogSummaryRoutes(framework);
  initAdjacentSearchResultsRoutes(framework);
  initContainedSearchResultsRoutes(framework);
  initSearchSummaryRoutes(framework);
};
