/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { StreamsAPIClient, createStreamsAPIClient } from './api';
import type {
  ConfigSchema,
  StreamsAPIPublicSetup,
  StreamsAPIPublicStart,
  StreamsAPISetupDependencies,
  StreamsAPIStartDependencies,
} from './types';

export class StreamsAPIPlugin
  implements
    Plugin<
      StreamsAPIPublicSetup,
      StreamsAPIPublicStart,
      StreamsAPISetupDependencies,
      StreamsAPIStartDependencies
    >
{
  logger: Logger;
  streamsAPIClient!: StreamsAPIClient;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<StreamsAPIStartDependencies, StreamsAPIPublicStart>,
    pluginsSetup: StreamsAPISetupDependencies
  ): StreamsAPIPublicSetup {
    const streamsAPIClient = (this.streamsAPIClient = createStreamsAPIClient(coreSetup));

    return {
      streamsAPIClient,
    };
  }

  start(coreStart: CoreStart, pluginsStart: StreamsAPIStartDependencies): StreamsAPIPublicStart {
    return {
      streamsAPIClient: this.streamsAPIClient,
    };
  }
}
