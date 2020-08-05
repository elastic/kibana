/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from '../../../../src/core/server';

import { ConfigSchema } from './config';
import { ListPlugin } from './plugin';

// exporting these since its required at top level in siem plugin
export { ListClient } from './services/lists/list_client';
export { ExceptionListClient } from './services/exception_lists/exception_list_client';
export { ListPluginSetup } from './types';

export const config = { schema: ConfigSchema };
export const plugin = (initializerContext: PluginInitializerContext): ListPlugin =>
  new ListPlugin(initializerContext);
