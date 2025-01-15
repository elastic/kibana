/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core-plugins-browser';
import { Plugin } from '@kbn/core-plugins-browser';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface DataDefinitionPublicSetupDependencies {}

export interface DataDefinitionPublicStartDependencies {}

export interface DataDefinitionPublicSetup {}

export interface DataDefinitionPublicStart {}

export interface DataDefinitionClient {}

export type IDataDefinitionPublicPluginInitializer = PluginInitializer<
  DataDefinitionPublicStart,
  DataDefinitionPublicSetup,
  DataDefinitionPublicStartDependencies,
  DataDefinitionPublicSetupDependencies
>;

export type IDataDefinitionPublicPlugin = Plugin<
  DataDefinitionPublicStart,
  DataDefinitionPublicSetup,
  DataDefinitionPublicStartDependencies,
  DataDefinitionPublicSetupDependencies
>;

export function createPlugin(context: PluginInitializerContext): IDataDefinitionPublicPlugin {
  return {
    setup(coreSetup, pluginsSetup) {
      return {};
    },
    start() {
      return {};
    },
  };
}
