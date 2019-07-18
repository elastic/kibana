/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer } from 'src/core/server';
import { ProxyConfig, ProxyService, ProxyServiceSetup, ProxyServiceStart } from './proxy';
export { ProxyPluginType } from './proxy';
export { RouteState } from './cluster_doc';

export const config = ProxyConfig;
export const plugin: PluginInitializer<
  ProxyServiceSetup | undefined,
  ProxyServiceStart | undefined
> = initializerContext => new ProxyService(initializerContext);
