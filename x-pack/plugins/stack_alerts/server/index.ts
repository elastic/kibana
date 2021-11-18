/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { PluginConfigDescriptor, PluginInitializerContext } from 'src/core/server';
import { AlertingBuiltinsPlugin } from './plugin';
import { configSchema, Config } from '../common/config';
export { ID as INDEX_THRESHOLD_ID } from './alert_types/index_threshold/alert_type';

export const config: PluginConfigDescriptor<Config> = {
  exposeToBrowser: {},
  schema: configSchema,
  deprecations: () => [
    (settings, fromPath, addDeprecation) => {
      const stackAlerts = get(settings, fromPath);
      if (stackAlerts?.enabled === false || stackAlerts?.enabled === true) {
        addDeprecation({
          level: 'critical',
          configPath: 'xpack.stack_alerts.enabled',
          message: `"xpack.stack_alerts.enabled" is deprecated. The ability to disable this plugin will be removed in 8.0.0.`,
          correctiveActions: {
            manualSteps: [`Remove "xpack.stack_alerts.enabled" from your kibana configs.`],
          },
        });
      }
    },
  ],
};

export const plugin = (ctx: PluginInitializerContext) => new AlertingBuiltinsPlugin(ctx);
