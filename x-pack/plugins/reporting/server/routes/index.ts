/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LevelLogger as Logger } from '../lib';
import { registerJobGenerationRoutes } from './generation';
import { registerJobInfoRoutes } from './jobs';
import { ReportingCore } from '../core';
import { registerDiagnosticRoutes } from './diagnostic';

export function registerRoutes(reporting: ReportingCore, logger: Logger) {
  registerJobGenerationRoutes(reporting, logger);
  registerJobInfoRoutes(reporting);
  registerDiagnosticRoutes(reporting, logger);
}

export interface ReportingRequestPre {
  management: {
    jobTypes: string[];
  };
  user: string;
}
