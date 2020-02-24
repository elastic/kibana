/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext } from 'kibana/server';
import { WatcherServerPlugin } from './plugin';

export { WatcherContext } from './plugin';

export const plugin = (ctx: PluginInitializerContext) => new WatcherServerPlugin(ctx);
