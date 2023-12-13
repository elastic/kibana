/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core-plugins-server';

export const plugin = async (initContext: PluginInitializerContext) => {
  const { AuditPlugin } = await import('./plugin');
  return new AuditPlugin(initContext);
};
