/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OsqueryTelemetryTaskConfig } from '../task';
import { createTelemetryPacksTaskConfig } from './packs';
import { createTelemetrySavedQueriesTaskConfig } from './saved_queries';
import { MAX_PACK_TELEMETRY_BATCH } from '../constants';

export function createTelemetryTaskConfigs(): OsqueryTelemetryTaskConfig[] {
  return [
    createTelemetryPacksTaskConfig(MAX_PACK_TELEMETRY_BATCH),
    createTelemetrySavedQueriesTaskConfig(MAX_PACK_TELEMETRY_BATCH),
  ];
}
