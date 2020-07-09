/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { AuditTrailPlugin } from './plugin';

export { config } from './config';
export const plugin = (initializerContext: PluginInitializerContext) => {
  return new AuditTrailPlugin(initializerContext);
};
