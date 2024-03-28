/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchPlaygroundPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchPlaygroundPluginStart {}

export interface SearchPlaygroundPluginStartDependencies {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export * from '../common/types';
