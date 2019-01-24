/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraBackendFrameworkAdapter } from '../lib/adapters/framework';
import { initAdjacentSearchResultsRoutes } from './adjacent_search_results';
import { initContainedSearchResultsRoutes } from './contained_search_results';
import { initSearchSummaryRoutes } from './search_summary';

export const initLegacyLoggingRoutes = (framework: InfraBackendFrameworkAdapter) => {
  initAdjacentSearchResultsRoutes(framework);
  initContainedSearchResultsRoutes(framework);
  initSearchSummaryRoutes(framework);
};
