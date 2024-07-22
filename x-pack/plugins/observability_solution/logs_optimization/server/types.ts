/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { FieldsMetadataServerStart } from '@kbn/fields-metadata-plugin/server';
import { DetectionsServiceSetup, DetectionsServiceStart } from './services/detections';
import {
  RecommendationsServiceSetup,
  RecommendationsServiceStart,
} from './services/recommendations/types';

export type LogsOptimizationPluginCoreSetup = CoreSetup<
  LogsOptimizationServerPluginStartDeps,
  LogsOptimizationServerStart
>;
export type LogsOptimizationPluginStartServicesAccessor =
  LogsOptimizationPluginCoreSetup['getStartServices'];

export interface LogsOptimizationServerSetup {
  detectionsService: DetectionsServiceSetup;
  recommendationsService: RecommendationsServiceSetup;
}

export interface LogsOptimizationServerStart {
  detectionsService: DetectionsServiceStart;
  recommendationsService: RecommendationsServiceStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogsOptimizationServerPluginSetupDeps {}

export interface LogsOptimizationServerPluginStartDeps {
  fieldsMetadata: FieldsMetadataServerStart;
}
