/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '@kbn/core/server';
import { ObservabilityOnboardingPlugin } from './plugin';

const configSchema = schema.object({
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
});

export type ObservabilityOnboardingConfig = TypeOf<typeof configSchema>;

// plugin config
export const config: PluginConfigDescriptor<ObservabilityOnboardingConfig> = {
  exposeToBrowser: {
    ui: true,
  },
  schema: configSchema,
};

export function plugin(initializerContext: PluginInitializerContext) {
  return new ObservabilityOnboardingPlugin(initializerContext);
}

export type {
  ObservabilityOnboardingPluginSetup,
  ObservabilityOnboardingPluginStart,
} from './types';
