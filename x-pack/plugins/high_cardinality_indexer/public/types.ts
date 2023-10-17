/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface HighCardinalityIndexerPluginStart {}

export interface HighCardinalityIndexerPluginSetup {}
export interface HighCardinalityIndexerPluginSetupDependencies {
  observabilityShared: ObservabilitySharedPluginSetup;
}
export interface HighCardinalityIndexerPluginStartDependencies {
  observabilityShared: ObservabilitySharedPluginStart;
}
