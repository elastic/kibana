/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { type ConfigSchema } from '../common/constants/app';
import { configSchema } from './config_schema';
export type { MlPluginSetup, MlPluginStart } from './plugin';
export type {
  DatafeedStats as MlDatafeedStats,
  Job as MlJob,
  MlSummaryJob,
  SummaryJobState as MlSummaryJobState,
  AlertingService as MlAlertingService,
  AnomalyDetectors as MlAnomalyDetectors,
  JobService as MlJobService,
  MlSystem as MlMlSystem,
  Modules as MlModules,
  ResultsService as MlResultsService,
  TrainedModels as MlTrainedModels,
} from './shared';
export {
  UnknownMLCapabilitiesError,
  InsufficientMLCapabilities,
  MLPrivilegesUninitialized,
} from './shared';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
  exposeToBrowser: {
    ad: true,
    dfa: true,
    nlp: true,
    experimental: true,
  },
};

export const plugin = async (ctx: PluginInitializerContext<ConfigSchema>) => {
  const { MlServerPlugin } = await import('./plugin');
  return new MlServerPlugin(ctx);
};
