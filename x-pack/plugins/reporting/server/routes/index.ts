/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ReportingCore } from '..';
import { registerDeprecationsRoutes } from './internal/deprecations/deprecations';
import { registerDiagnosticRoutes } from './internal/diagnostic';
import { registerGenerateCsvFromSavedObjectImmediate } from './internal/generate/csv_searchsource_immediate';
import { registerGenerationRoutesInternal } from './internal/generate/generate_from_jobparams';
import { registerJobInfoRoutesInternal } from './internal/management/jobs';
import { registerGenerationRoutesPublic } from './public/generate_from_jobparams';
import { registerJobInfoRoutesPublic } from './public/jobs';

export function registerRoutes(reporting: ReportingCore, logger: Logger) {
  registerDeprecationsRoutes(reporting, logger);
  registerDiagnosticRoutes(reporting, logger);
  registerGenerationRoutesInternal(reporting, logger);
  registerJobInfoRoutesInternal(reporting);
  registerGenerationRoutesPublic(reporting, logger);
  registerJobInfoRoutesPublic(reporting);

  // (deprecated) allow users to download CSV without generating a report
  const config = reporting.getConfig();
  if (config.csv.enablePanelActionDownload) {
    registerGenerateCsvFromSavedObjectImmediate(reporting, logger);
  }
}
