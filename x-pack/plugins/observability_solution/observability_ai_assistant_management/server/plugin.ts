/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { uiSettings } from '../common/ui_settings';

export type ObservabilityPluginSetup = ReturnType<AiAssistantManagementPlugin['setup']>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface PluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface PluginStart {}

export class AiAssistantManagementPlugin implements Plugin<ObservabilityPluginSetup> {
  private logger: Logger;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup<PluginStart>, plugins: PluginSetup) {
    core.uiSettings.register(uiSettings);
    return {};
  }

  public start(core: CoreStart, plugins: PluginStart) {}

  public stop() {}
}
