/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { CodeConfigSchema } from './config';
import { CodePlugin } from './plugin';

export const config = { schema: CodeConfigSchema };
export const plugin = (initializerContext: PluginInitializerContext) =>
  new CodePlugin(initializerContext);
