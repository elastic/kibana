/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '@kbn/core/server';
import { EntityManagerUIConfig, configSchema, exposeToBrowserConfig } from '../common/config';
import {
  EntityManagerUIPluginSetupDependencies,
  EntityManagerUIPluginStartDependencies,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntityManagerUIServerSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntityManagerUIServerStart {}

export const config: PluginConfigDescriptor<EntityManagerUIConfig> = {
  schema: configSchema,
  exposeToBrowser: exposeToBrowserConfig,
};

export class EntityManagerUIServerPlugin
  implements
    Plugin<
      EntityManagerUIServerStart,
      EntityManagerUIServerSetup,
      EntityManagerUIPluginSetupDependencies,
      EntityManagerUIPluginStartDependencies
    >
{
  public config: EntityManagerUIConfig;
  public logger: Logger;

  constructor(context: PluginInitializerContext<EntityManagerUIConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  public setup(
    core: CoreSetup,
    plugins: EntityManagerUIPluginSetupDependencies
  ): EntityManagerUIServerSetup {
    return {};
  }

  public start(
    core: CoreStart,
    plugins: EntityManagerUIPluginStartDependencies
  ): EntityManagerUIServerStart {
    return {};
  }

  public stop() {}
}
