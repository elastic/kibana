/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';

interface FixtureStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security: SecurityPluginStart;
}

export class FixturePlugin implements Plugin<void, void, {}, FixtureStartDeps> {
  constructor(context: PluginInitializerContext<{}>) {}

  public setup() {}
  public start() {}
  public stop() {}
}
