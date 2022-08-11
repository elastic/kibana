/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { API_USAGE_COUNTER_TYPE } from '../../common/constants';
import { ReportingCore } from '..';
import { registerDeprecationsRoutes } from './deprecations/deprecations';
import { registerDiagnosticRoutes } from './diagnostic';
import {
  registerGenerateCsvFromSavedObjectImmediate,
  registerJobGenerationRoutes,
} from './generate';
import { registerJobInfoRoutes } from './management';

export function incrementApiUsageCounter(
  method: string,
  path: string,
  usageCounter: UsageCounter | undefined
) {
  usageCounter?.incrementCounter({
    counterName: `${method} ${path}`,
    counterType: API_USAGE_COUNTER_TYPE,
  });
}

export function registerRoutes(reporting: ReportingCore, logger: Logger) {
  registerDeprecationsRoutes(reporting, logger);
  registerDiagnosticRoutes(reporting, logger);
  registerGenerateCsvFromSavedObjectImmediate(reporting, logger);
  registerJobGenerationRoutes(reporting, logger);
  registerJobInfoRoutes(reporting);
}
