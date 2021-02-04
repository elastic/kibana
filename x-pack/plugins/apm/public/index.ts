/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PluginInitializer,
  PluginInitializerContext,
} from '../../../../src/core/public';
import { ApmPlugin, ApmPluginSetup, ApmPluginStart } from './plugin';

export interface ConfigSchema {
  serviceMapEnabled: boolean;
  ui: {
    enabled: boolean;
  };
}

export const plugin: PluginInitializer<ApmPluginSetup, ApmPluginStart> = (
  pluginInitializerContext: PluginInitializerContext<ConfigSchema>
) => new ApmPlugin(pluginInitializerContext);

export { ApmPluginSetup, ApmPluginStart };
