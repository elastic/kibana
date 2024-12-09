/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  createPlugin,
  type DataDefinitionRegistryPublicSetupDependencies,
  type DataDefinitionRegistryPublicStartDependencies,
  type IDataDefinitionRegistryPublicPluginInitializer,
} from './plugin';

export type {
  DataDefinitionRegistryPublicSetupDependencies,
  DataDefinitionRegistryPublicStartDependencies,
};

export const plugin: IDataDefinitionRegistryPublicPluginInitializer = (pluginInitializerContext) =>
  createPlugin(pluginInitializerContext);
