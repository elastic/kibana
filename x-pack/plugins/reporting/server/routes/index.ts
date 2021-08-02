/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingCore } from '../core';
import { LevelLogger as Logger } from '../lib';
import { registerDeprecationsRoutes } from './deprecations';
import { registerDiagnosticRoutes } from './diagnostic';
import { registerJobGenerationRoutes } from './generation';
import { registerJobInfoRoutes } from './jobs';
import { registerSchedulingRoutes } from './schedules';

export function registerRoutes(reporting: ReportingCore, logger: Logger) {
  registerDeprecationsRoutes(reporting, logger);
  registerDiagnosticRoutes(reporting, logger);
  registerJobGenerationRoutes(reporting, logger);
  registerJobInfoRoutes(reporting);
  registerSchedulingRoutes(reporting, logger);
}

export interface ReportingRequestPre {
  management: {
    jobTypes: string[];
  };
  user: string;
}

export const handleUnavailable = (res: any) => {
  return res.custom({ statusCode: 503, body: 'Not Available' });
};
