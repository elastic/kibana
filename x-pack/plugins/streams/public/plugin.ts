/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { Logger } from '@kbn/logging';

import type { StreamsPublicConfig } from '../common/config';
import { StreamsPluginClass, StreamsPluginSetup, StreamsPluginStart } from './types';

export class Plugin implements StreamsPluginClass {
  public config: StreamsPublicConfig;
  public logger: Logger;

  constructor(context: PluginInitializerContext<{}>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup<StreamsPluginStart>, pluginSetup: StreamsPluginSetup) {
    return {};
  }

  start(core: CoreStart) {
    return {};
  }

  stop() {}
}
