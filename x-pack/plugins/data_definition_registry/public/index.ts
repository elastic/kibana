/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  DataDefinitionRegistryPublicSetup,
  DataDefinitionRegistryPublicStart,
  IDataDefinitionRegistryPublicPluginInitializer,
} from './types';
import { createPlugin } from './plugin';

export type { DataDefinitionRegistryPublicSetup, DataDefinitionRegistryPublicStart };
export type { EsqlQueryDefinition } from '../server/data_definition_registry/types';

export const plugin: IDataDefinitionRegistryPublicPluginInitializer = (pluginInitializerContext) =>
  createPlugin(pluginInitializerContext);
