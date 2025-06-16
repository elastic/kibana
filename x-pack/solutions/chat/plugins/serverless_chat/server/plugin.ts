/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
} from '@kbn/core/server';
import { CHAT_PROJECT_SETTINGS } from '@kbn/serverless-chat-settings';

import type { ServerlessChatConfig } from './config';
import type {
  ServerlessChatPluginSetup,
  ServerlessChatPluginStart,
  SetupDependencies,
  StartDependencies,
} from './types';

export class ServerlessChatPlugin
  implements
    Plugin<
      ServerlessChatPluginSetup,
      ServerlessChatPluginStart,
      SetupDependencies,
      StartDependencies
    >
{
  // @ts-ignore config is not used for now
  private readonly config: ServerlessChatConfig;
  // @ts-ignore logger is not used for now
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ServerlessChatConfig>();
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<StartDependencies>, { serverless }: SetupDependencies) {
    serverless.setupProjectSettings(CHAT_PROJECT_SETTINGS);
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
