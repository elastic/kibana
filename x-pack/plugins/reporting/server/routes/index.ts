/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LevelLogger as Logger } from '../lib';
import { registerJobGenerationRoutes } from './generation';
import { registerJobInfoRoutes } from './jobs';
import { ReportingCore } from '../core';

export function registerRoutes(reporting: ReportingCore, logger: Logger) {
  registerJobGenerationRoutes(reporting, logger);
  registerJobInfoRoutes(reporting);
}
