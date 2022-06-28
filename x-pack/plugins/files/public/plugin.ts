/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';

export class FilesPlugin implements Plugin {
  constructor(private readonly ctx: PluginInitializerContext) {}
  setup(core: CoreSetup, plugins: object): void {}
  start(core: CoreStart, plugins: object): void {}
}
