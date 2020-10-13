/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginConfigDescriptor } from 'kibana/server';
import { configSchema, ConfigSchema } from '../config';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    enableGeoTrackingThresholdAlert: true,
  },
  schema: configSchema,
};

export const plugin = () => ({
  setup() {},
  start() {},
});
