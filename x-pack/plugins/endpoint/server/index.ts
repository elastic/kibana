/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer, PluginInitializerContext } from 'src/core/server';
import {
  EndpointPlugin,
  EndpointPluginStart,
  EndpointPluginSetup,
  EndpointPluginStartDependencies,
  EndpointPluginSetupDependencies,
} from './plugin';
import { EndpointConfigSchema } from './config';

export const config = {
  schema: EndpointConfigSchema,
};

export const plugin: PluginInitializer<
  EndpointPluginSetup,
  EndpointPluginStart,
  EndpointPluginSetupDependencies,
  EndpointPluginStartDependencies
> = (initializerContext: PluginInitializerContext) => new EndpointPlugin(initializerContext);
