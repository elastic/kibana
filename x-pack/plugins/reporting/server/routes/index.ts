/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ReportingCore } from '..';
import { registerDeprecationRoutes as internalDeprecationRoutes } from './internal/deprecations/deprecations';
import { registerDiagnosticRoutes as internalDiagnosticsRoutes } from './internal/diagnostic';
import { registerGenerateCsvFromSavedObjectImmediate as internalCsvFromSavedObjectImmediate } from './internal/generate/csv_searchsource_immediate';
import { registerGeneration as internalGenerationRoutes } from './internal/generate/generate_from_jobparams';
import { registerJobRoutes as internalJobRoutes } from './internal/management';
import { registerGenerationRoutes as publicGenerationRoutes } from './public/generate_from_jobparams';
import { registerJobRoutes as publicJobRoutes } from './public/jobs';

export function registerRoutes(reporting: ReportingCore, logger: Logger) {
  internalDeprecationRoutes(reporting, logger);
  internalDiagnosticsRoutes(reporting, logger);
  internalCsvFromSavedObjectImmediate(reporting, logger);
  internalGenerationRoutes(reporting, logger);
  internalJobRoutes(reporting);
  publicGenerationRoutes(reporting, logger);
  publicJobRoutes(reporting);
}
