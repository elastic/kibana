/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '../../../../src/core/public';
import { CloudPlugin } from './plugin';

export { CloudSetup, CloudConfigType } from './plugin';
export function plugin(initializerContext: PluginInitializerContext) {
  return new CloudPlugin(initializerContext);
}
