/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin as PluginClass } from '@kbn/core/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogsOptimizationPublicSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogsOptimizationPublicStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogsOptimizationPublicSetupDeps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogsOptimizationPublicStartDeps {}

export type LogsOptimizationClientCoreSetup = CoreSetup<
  LogsOptimizationPublicStartDeps,
  LogsOptimizationPublicStart
>;
export type LogsOptimizationClientCoreStart = CoreStart;
export type LogsOptimizationClientPluginClass = PluginClass<
  LogsOptimizationPublicSetup,
  LogsOptimizationPublicStart,
  LogsOptimizationPublicSetupDeps,
  LogsOptimizationPublicStartDeps
>;

export type LogsOptimizationPublicStartServicesAccessor =
  LogsOptimizationClientCoreSetup['getStartServices'];
export type LogsOptimizationPublicStartServices =
  ReturnType<LogsOptimizationPublicStartServicesAccessor>;
