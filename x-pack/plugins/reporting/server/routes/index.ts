/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LevelLogger as Logger } from '../lib';
import { registerDeprecationsRoutes } from './deprecations';
import { registerDiagnosticRoutes } from './diagnostic';
import { registerJobGenerationRoutes } from './generation';
import { registerJobInfoRoutes } from './jobs';
import { ReportingCore } from '../core';

export function registerRoutes(reporting: ReportingCore, logger: Logger) {
  registerDeprecationsRoutes(reporting, logger);
  registerDiagnosticRoutes(reporting, logger);
  registerJobGenerationRoutes(reporting, logger);
  registerJobInfoRoutes(reporting);
}

export interface ReportingRequestPre {
  management: {
    jobTypes: string[];
  };
  user: string;
}
