/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from 'src/core/server';

import { ConfigSchema } from './config';
import { EncryptedSavedObjectsPlugin } from './plugin';

export type { EncryptedSavedObjectTypeRegistration } from './crypto';
export { EncryptionError } from './crypto';
export type { EncryptedSavedObjectsPluginSetup, EncryptedSavedObjectsPluginStart } from './plugin';
export type { EncryptedSavedObjectsClient } from './saved_objects';
export type { IsMigrationNeededPredicate } from './create_migration';

export const config: PluginConfigDescriptor = {
  schema: ConfigSchema,
};
export const plugin = (initializerContext: PluginInitializerContext) =>
  new EncryptedSavedObjectsPlugin(initializerContext);
