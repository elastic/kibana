/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  createPlugin,
  type DataDefinitionServerSetupDependencies,
  type DataDefinitionServerStartDependencies,
  type IDataDefinitionServerPluginInitializer,
} from './plugin';

export type { DataDefinitionServerRouteRepository } from './routes/repository';

export type { DataDefinitionServerSetupDependencies, DataDefinitionServerStartDependencies };

export const plugin: IDataDefinitionServerPluginInitializer = async (pluginInitializerContext) =>
  createPlugin(pluginInitializerContext);
