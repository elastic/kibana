/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';

interface ApiKeyPluginSetup {}
interface ApiKeyPluginStart {}

export class ApiKeyPlugin implements Plugin<ApiKeyPluginSetup, ApiKeyPluginStart> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<AppPluginStartDependencies, ApiKeyPluginStart>,
    deps: AppPluginSetupDependencies
  ): ApiKeyPluginSetup {
    return {};
  }

  public start() {}

  public stop() {}
}
