/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsSharedBackendLibs } from './lib/logs_shared_types';
import {
  initLogEntriesHighlightsRoute,
  initLogEntriesSummaryHighlightsRoute,
  initLogEntriesSummaryRoute,
} from './routes/log_entries';
import { initLogViewRoutes } from './routes/log_views';
import { initMigrateLogViewSettingsRoute } from './routes/deprecations';

export const initLogsSharedServer = (libs: LogsSharedBackendLibs) => {
  initLogEntriesHighlightsRoute(libs);
  initLogEntriesSummaryRoute(libs);
  initLogEntriesSummaryHighlightsRoute(libs);
  initLogViewRoutes(libs);
  initMigrateLogViewSettingsRoute(libs);
};
