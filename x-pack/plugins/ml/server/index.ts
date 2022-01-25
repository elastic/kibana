/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'kibana/server';
import { MlServerPlugin } from './plugin';
export type { MlPluginSetup, MlPluginStart } from './plugin';
export type {
  AnomalyRecordDoc as MlAnomalyRecordDoc,
  AnomaliesTableRecord as MlAnomaliesTableRecord,
  AnomalyResultType as MlAnomalyResultType,
  DatafeedStats as MlDatafeedStats,
  Job as MlJob,
} from './shared';
export {
  UnknownMLCapabilitiesError,
  InsufficientMLCapabilities,
  MLPrivilegesUninitialized,
  getHistogramsForFields,
} from './shared';

export const plugin = (ctx: PluginInitializerContext) => new MlServerPlugin(ctx);
