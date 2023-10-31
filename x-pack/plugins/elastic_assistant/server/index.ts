/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';
import { ElasticAssistantPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new ElasticAssistantPlugin(initializerContext);
}

export type {
  ElasticAssistantPluginSetup as EcsDataQualityDashboardPluginSetup,
  ElasticAssistantPluginStart as EcsDataQualityDashboardPluginStart,
} from './types';
