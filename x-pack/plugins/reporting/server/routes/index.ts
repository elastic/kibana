/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingCore } from '..';
import { LevelLogger } from '../lib';
import { registerDeprecationsRoutes } from './deprecations';
import { registerDiagnosticRoutes } from './diagnostic';
import {
  registerGenerateCsvFromSavedObjectImmediate,
  registerJobGenerationRoutes,
  registerLegacy,
} from './generate';
import { registerJobInfoRoutes } from './management';

export function registerRoutes(reporting: ReportingCore, logger: LevelLogger) {
  registerDeprecationsRoutes(reporting, logger);
  registerDiagnosticRoutes(reporting, logger);
  registerGenerateCsvFromSavedObjectImmediate(reporting, logger);
  registerJobGenerationRoutes(reporting, logger);
  registerLegacy(reporting, logger);
  registerJobInfoRoutes(reporting);
}
