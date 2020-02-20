/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, PluginInitializer } from 'kibana/public';
import { Plugin, ClientSetup, ClientStart, ClientPluginsSetup, ClientPluginsStart } from './plugin';

export const plugin: PluginInitializer<
  ClientSetup,
  ClientStart,
  ClientPluginsSetup,
  ClientPluginsStart
> = (context: PluginInitializerContext) => {
  return new Plugin(context);
};

export { FORMATTERS } from './utils/formatters';
export { InfraFormatterType } from './lib/lib';

export type InfraAppId = 'logs' | 'metrics';
