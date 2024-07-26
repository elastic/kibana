/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin as PluginClass,
} from '@kbn/core/public';
import { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { ServerlessPluginStart } from '@kbn/serverless/public';
import { UsePipelineSimulatorHook } from './hooks/use_pipeline_simulator';
import { UseRecommendationsHook } from './hooks/use_recommendations';
import { RecommendationsServiceStart } from './services/recommendations';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogsOptimizationPublicSetup {}

export interface LogsOptimizationPublicStart {
  recommendations: RecommendationsServiceStart;
  useRecommendations: UseRecommendationsHook;
  usePipelineSimulator: UsePipelineSimulatorHook;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogsOptimizationPublicSetupDeps {}

export interface LogsOptimizationPublicStartDeps {
  fieldsMetadata: FieldsMetadataPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  serverless?: ServerlessPluginStart;
}

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

export type LogsOptimizationAppMountParameters = AppMountParameters;

export type LogsOptimizationPublicStartServicesAccessor =
  LogsOptimizationClientCoreSetup['getStartServices'];
export type LogsOptimizationPublicStartServices =
  ReturnType<LogsOptimizationPublicStartServicesAccessor>;
