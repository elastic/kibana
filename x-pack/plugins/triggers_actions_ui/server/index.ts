/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PluginConfigDescriptor, PluginInitializerContext } from 'kibana/server';
import { configSchema, ConfigSchema } from './config';
import { TriggersActionsPlugin } from './plugin';

export type { PluginStartContract } from './plugin';
export type { TimeSeriesQuery, CoreQueryParams } from './data';
export {
  CoreQueryParamsSchemaProperties,
  validateCoreQueryBody,
  validateTimeWindowUnits,
  MAX_INTERVALS,
  MAX_GROUPS,
  DEFAULT_GROUPS,
} from './data';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    enableGeoTrackingThresholdAlert: true,
    enableExperimental: true,
  },
  schema: configSchema,
};

export const plugin = (ctx: PluginInitializerContext) => new TriggersActionsPlugin(ctx);
