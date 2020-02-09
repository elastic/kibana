/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/public';
import { Plugin } from './plugin';

export { AlertsContextProvider } from './application/context/alerts_context';
export { AlertAdd } from './application/sections/alert_add';

export function plugin(ctx: PluginInitializerContext) {
  return new Plugin(ctx);
}

export { Plugin };
export * from './plugin';
