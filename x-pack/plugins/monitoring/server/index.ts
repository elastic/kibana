/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext, PluginConfigDescriptor } from '../../../../src/core/server';
import { MonitoringPlugin } from './plugin';
import { configSchema } from './config';
import { deprecations } from './deprecations';

export { KibanaSettingsCollector } from './kibana_monitoring/collectors';
export { MonitoringConfig } from './config';
export { MonitoringPluginSetup, IBulkUploader } from './types';

export const plugin = (initContext: PluginInitializerContext) => new MonitoringPlugin(initContext);
export const config: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
  schema: configSchema,
  deprecations,
  exposeToBrowser: {
    enabled: true,
    ui: true,
    kibana: true,
  },
};
