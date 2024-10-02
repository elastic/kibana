/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { DataUsageConfig } from './config';
import type {
  DataUsageServerSetup,
  DataUsageServerStart,
  DataUsageSetupDependencies,
  DataUsageStartDependencies,
} from './types';

export class DataUsagePlugin
  implements
    Plugin<
      DataUsageServerSetup,
      DataUsageServerStart,
      DataUsageSetupDependencies,
      DataUsageStartDependencies
    >
{
  logger: Logger;
  constructor(context: PluginInitializerContext<DataUsageConfig>) {
    this.logger = context.logger.get();
  }
  setup(coreSetup: CoreSetup, pluginsSetup: DataUsageSetupDependencies): DataUsageServerSetup {
    return {};
  }

  start(coreStart: CoreStart, pluginsStart: DataUsageStartDependencies): DataUsageServerStart {
    return {};
  }

  public stop() {}
}
