/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  createPlugin,
  type IDataDefinitionRegistryServerPluginInitializer,
  type DataDefinitionRegistryServerSetup,
  type DataDefinitionRegistryServerStart,
} from './plugin';

export type { DataDefinitionRegistryServerRouteRepository } from './routes';
export type {
  DynamicDataAsset,
  DataDefinitionRegistryClient,
  EsqlQueryTemplate,
} from './data_definition_registry/types';

export type { DataDefinitionRegistryServerSetup, DataDefinitionRegistryServerStart };

export const plugin: IDataDefinitionRegistryServerPluginInitializer = async (
  pluginInitializerContext
) => createPlugin(pluginInitializerContext);
