/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsSharedLibs } from './lib/infra_types';
import {
  initLogEntriesHighlightsRoute,
  initLogEntriesSummaryHighlightsRoute,
  initLogEntriesSummaryRoute,
} from './routes/log_entries';
import { initLogViewRoutes } from './routes/log_views';

export const initLogsSharedServer = (libs: LogsSharedLibs) => {
  initLogEntriesHighlightsRoute(libs);
  initLogEntriesSummaryRoute(libs);
  initLogEntriesSummaryHighlightsRoute(libs);
  initLogViewRoutes(libs);
};
