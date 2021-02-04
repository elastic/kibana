/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from 'kibana/server';
import { configSchema, ConfigSchema } from '../config';
import { TriggersActionsPlugin } from './plugin';

export { PluginStartContract } from './plugin';
export {
  TimeSeriesQuery,
  CoreQueryParams,
  CoreQueryParamsSchemaProperties,
  validateCoreQueryBody,
  MAX_INTERVALS,
  MAX_GROUPS,
  DEFAULT_GROUPS,
} from './data';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    enableGeoTrackingThresholdAlert: true,
  },
  schema: configSchema,
};

export const plugin = (ctx: PluginInitializerContext) => new TriggersActionsPlugin(ctx);
