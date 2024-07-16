/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { DetectionsServiceSetup, DetectionsServiceStart } from './services/detections';

export type LogsOptimizationPluginCoreSetup = CoreSetup<
  LogsOptimizationServerPluginStartDeps,
  LogsOptimizationServerStart
>;
export type LogsOptimizationPluginStartServicesAccessor =
  LogsOptimizationPluginCoreSetup['getStartServices'];

export interface LogsOptimizationServerSetup {
  detectionsService: DetectionsServiceSetup;
}

export interface LogsOptimizationServerStart {
  detectionsService: DetectionsServiceStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogsOptimizationServerPluginSetupDeps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogsOptimizationServerPluginStartDeps {}
