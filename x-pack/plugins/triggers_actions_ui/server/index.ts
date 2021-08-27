/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { PluginConfigDescriptor, PluginInitializerContext } from 'kibana/server';
import { configSchema, ConfigSchema } from '../config';
import { TriggersActionsPlugin } from './plugin';

export { PluginStartContract } from './plugin';
export {
  TimeSeriesQuery,
  CoreQueryParams,
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
  },
  schema: configSchema,
  deprecations: () => [
    (settings, fromPath, addDeprecation) => {
      const triggersActionsUi = get(settings, fromPath);
      if (triggersActionsUi?.enabled === false || triggersActionsUi?.enabled === true) {
        addDeprecation({
          message: `"xpack.trigger_actions_ui.enabled" is deprecated. The ability to disable this plugin will be removed in 8.0.0.`,
          correctiveActions: {
            manualSteps: [`Remove "xpack.trigger_actions_ui.enabled" from your kibana configs.`],
          },
        });
      }
    },
  ],
};

export const plugin = (ctx: PluginInitializerContext) => new TriggersActionsPlugin(ctx);
