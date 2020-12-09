/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from 'src/core/server';
import { AlertingBuiltinsPlugin } from './plugin';
import { configSchema, Config } from '../common/config';
export { ID as INDEX_THRESHOLD_ID } from './alert_types/index_threshold/alert_type';

export const config: PluginConfigDescriptor<Config> = {
  exposeToBrowser: {
    enableGeoAlerting: true,
  },
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot(
      'xpack.triggers_actions_ui.enableGeoTrackingThresholdAlert',
      'xpack.stack_alerts.enableGeoAlerting'
    ),
  ],
};

export const plugin = (ctx: PluginInitializerContext) => new AlertingBuiltinsPlugin(ctx);
