/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { Logger } from '@kbn/logging';

import type { ApiScraperPublicConfig } from '../common/config';
import { ApiScraperPluginClass, ApiScraperPluginSetup, ApiScraperPluginStart } from './types';

export class Plugin implements ApiScraperPluginClass {
  public config: ApiScraperPublicConfig;
  public logger: Logger;

  constructor(context: PluginInitializerContext<{}>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup<ApiScraperPluginStart>, pluginSetup: ApiScraperPluginSetup) {
    return {};
  }

  start(core: CoreStart) {
    return {};
  }

  stop() {}
}
