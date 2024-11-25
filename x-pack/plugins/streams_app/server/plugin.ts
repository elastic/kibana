/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  ConfigSchema,
  StreamsAppServerSetup,
  StreamsAppServerStart,
  StreamsAppSetupDependencies,
  StreamsAppStartDependencies,
} from './types';

export class StreamsAppPlugin
  implements
    Plugin<
      StreamsAppServerSetup,
      StreamsAppServerStart,
      StreamsAppSetupDependencies,
      StreamsAppStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<StreamsAppStartDependencies, StreamsAppServerStart>,
    pluginsSetup: StreamsAppSetupDependencies
  ): StreamsAppServerSetup {
    return {};
  }

  start(core: CoreStart, pluginsStart: StreamsAppStartDependencies): StreamsAppServerStart {
    return {};
  }
}
