/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { MlServerPlugin } from './plugin';
export type { MlPluginSetup, MlPluginStart } from './plugin';
import { configSchema, MlXPackConfig } from '../config';

export type {
  AnomalyRecordDoc as MlAnomalyRecordDoc,
  AnomaliesTableRecord as MlAnomaliesTableRecord,
  AnomalyResultType as MlAnomalyResultType,
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

export const config: PluginConfigDescriptor<MlXPackConfig> = {
  // exposeToBrowser specifies kibana.yml settings to expose to the browser
  // the value `true` in this context signals configuration is exposed to browser
  // exposeToBrowser: {
  //   showMapsInspectorAdapter: true,
  //   preserveDrawingBuffer: true,
  // },
  schema: configSchema,
};

export const plugin = (ctx: PluginInitializerContext) => new MlServerPlugin(ctx);
