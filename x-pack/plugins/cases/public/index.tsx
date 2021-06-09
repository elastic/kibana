/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'kibana/public';
import { CasesUiPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new CasesUiPlugin(initializerContext);
}

export { CasesUiPlugin };
export * from './plugin';
export * from './types';
