/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core-plugins-browser';
import type { Plugin } from '@kbn/core-plugins-browser';
import type { EsqlQueryDefinition } from '../server';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface DataDefinitionRegistryPublicSetupDependencies {}

export interface DataDefinitionRegistryPublicStartDependencies {}

export interface DataDefinitionRegistryPublicSetup {}

export interface DataDefinitionRegistryPublicStart {
  getQueries: (options: {
    start: number | string;
    end: number | string;
    index?: string | string[];
    kuery?: string;
    signal: AbortSignal;
  }) => Promise<EsqlQueryDefinition[]>;
}

export interface DataDefinitionRegistryClient {}

export type IDataDefinitionRegistryPublicPluginInitializer = PluginInitializer<
  DataDefinitionRegistryPublicSetup,
  DataDefinitionRegistryPublicStart,
  DataDefinitionRegistryPublicSetupDependencies,
  DataDefinitionRegistryPublicStartDependencies
>;

export type IDataDefinitionRegistryPublicPlugin = Plugin<
  DataDefinitionRegistryPublicSetup,
  DataDefinitionRegistryPublicStart,
  DataDefinitionRegistryPublicSetupDependencies,
  DataDefinitionRegistryPublicStartDependencies
>;
