/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ReportingCore } from '..';
import { PngCore } from '../export_types/png/types';
import { registerDeprecationsRoutes } from './deprecations/deprecations';
import { registerDiagnosticRoutes } from './diagnostic';
import {
  registerGenerateCsvFromSavedObjectImmediate,
  registerJobGenerationRoutes,
} from './generate';
import { registerJobInfoRoutes } from './management';

export function registerRoutes(reporting: ReportingCore, logger: Logger) {
  registerDeprecationsRoutes(reporting, logger);
  registerDiagnosticRoutes(reporting as unknown as PngCore, logger);
  registerGenerateCsvFromSavedObjectImmediate(reporting, logger);
  registerJobGenerationRoutes(reporting, logger);
  registerJobInfoRoutes(reporting);
}
