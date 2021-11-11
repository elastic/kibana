/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from 'kibana/server';
export { CasesClient } from './client';
import { ConfigType, ConfigSchema } from './config';
import { CasePlugin } from './plugin';

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: ConfigSchema,
  exposeToBrowser: {
    markdownPlugins: true,
  },
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('xpack.case.enabled', 'xpack.cases.enabled', { level: 'critical' }),
  ],
};
export const plugin = (initializerContext: PluginInitializerContext) =>
  new CasePlugin(initializerContext);

export type { PluginStartContract } from './plugin';
