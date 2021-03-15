/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'kibana/server';
import { ConfigSchema } from './config';
import { CasePlugin } from './plugin';

export { CaseRequestContext } from './types';
export const config = { schema: ConfigSchema };
export const plugin = (initializerContext: PluginInitializerContext) =>
  new CasePlugin(initializerContext);
