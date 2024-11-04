/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core-plugins-browser';
import { Plugin } from '@kbn/core-plugins-browser';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface DataDefinitionRegistryPublicSetupDependencies {}

export interface DataDefinitionRegistryPublicStartDependencies {}

export interface DataDefinitionRegistryPublicSetup {}

export interface DataDefinitionRegistryPublicStart {}

export interface DataDefinitionRegistryClient {}

export type IDataDefinitionRegistryPublicPluginInitializer = PluginInitializer<
  DataDefinitionRegistryPublicStart,
  DataDefinitionRegistryPublicSetup,
  DataDefinitionRegistryPublicStartDependencies,
  DataDefinitionRegistryPublicSetupDependencies
>;

export type IDataDefinitionRegistryPublicPlugin = Plugin<
  DataDefinitionRegistryPublicStart,
  DataDefinitionRegistryPublicSetup,
  DataDefinitionRegistryPublicStartDependencies,
  DataDefinitionRegistryPublicSetupDependencies
>;

export function createPlugin(
  context: PluginInitializerContext
): IDataDefinitionRegistryPublicPlugin {
  return {
    setup(coreSetup, pluginsSetup) {
      return {};
    },
    start() {
      return {};
    },
  };
}
