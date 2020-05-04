/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from '../../../../src/core/server';

import { ConfigSchema } from './config';
import { ListPlugin } from './plugin';

export { GetListClientType, ListClientType, ListPluginSetup } from './plugin';
export { getListItemByValues } from './services/items';
export const config = { schema: ConfigSchema };
export const plugin = (initializerContext: PluginInitializerContext): ListPlugin =>
  new ListPlugin(initializerContext);
