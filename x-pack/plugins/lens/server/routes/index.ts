/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger } from '@kbn/core/server';
import { PluginStartContract } from '../plugin';
import { existingFieldsRoute } from './existing_fields';
import { initFieldsRoute } from './field_stats';
import { initLensUsageRoute } from './telemetry';

export function setupRoutes(setup: CoreSetup<PluginStartContract>, logger: Logger) {
  existingFieldsRoute(setup, logger);
  initFieldsRoute(setup);
  initLensUsageRoute(setup);
}
