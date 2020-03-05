/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from '../../../../src/core/server';
import { Plugin } from './plugin';
import { configSchema, ConfigType } from './config';

export const plugin = (context: PluginInitializerContext) => {
  return new Plugin(context);
};

export const config = { schema: configSchema };

export { ConfigType };
