/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { ConfigSchema } from './config';
import { Plugin } from './plugin';

export { EncryptedSavedObjectTypeRegistration, EncryptionError } from './crypto';
export { PluginSetupContract, PluginStartContract } from './plugin';

export const config = { schema: ConfigSchema };
export const plugin = (initializerContext: PluginInitializerContext) =>
  new Plugin(initializerContext);
