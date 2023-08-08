/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';
import { MetricsDataServerPlugin } from './plugin';

export type {
  MetricsDataPluginSetup,
  MetricsDataPluginStart,
  InfraRequestHandlerContext,
} from './types';

export function plugin(context: PluginInitializerContext) {
  return new MetricsDataServerPlugin(context);
}
