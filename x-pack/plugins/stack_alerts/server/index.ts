/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from 'src/core/server';
import { AlertingBuiltinsPlugin } from './plugin';
import { configSchema, Config } from '../common/config';
export { ID as INDEX_THRESHOLD_ID } from './alert_types/index_threshold/alert_type';

export const config: PluginConfigDescriptor<Config> = {
  exposeToBrowser: {},
  schema: configSchema,
  deprecations: () => [
    (settings, fromPath, addDeprecation) => {
      if (
        settings?.xpack?.stackAlerts?.enabled === false ||
        settings?.xpack?.stackAlerts?.enabled === true
      ) {
        addDeprecation({
          message: `"xpack.stackAlerts.enabled" is deprecated. The ability to disable this plugin will be removed in 8.0.0.`,
          correctiveActions: {
            manualSteps: [`Remove "xpack.stackAlerts.enabled" from your kibana configs.`],
          },
        });
      }
    },
  ],
};

export const plugin = (ctx: PluginInitializerContext) => new AlertingBuiltinsPlugin(ctx);
