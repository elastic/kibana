/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ReportingCore } from '..';
import { registerDeprecations as internalDeprecations } from './internal/deprecations/deprecations';
import { registerDiagnostics as internalDiagnostics } from './internal/diagnostic';
import { registerGenerateCsvFromSavedObjectImmediate as internalCsvFromSavedObjectImmediate } from './internal/generate/csv_searchsource_immediate';
import { registerJobGeneration as internalJobGenerationRoutes } from './internal/generate/generate_from_jobparams';
import { registerJobInfo as internalJobInfoRoutes } from './internal/management';

export function registerRoutes(reporting: ReportingCore, logger: Logger) {
  internalDeprecations(reporting, logger);
  internalDiagnostics(reporting, logger);
  internalCsvFromSavedObjectImmediate(reporting, logger);
  internalJobGenerationRoutes(reporting, logger);
  internalJobInfoRoutes(reporting);
}
