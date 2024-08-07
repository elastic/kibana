/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { createInferenceClient } from './inference_client';
import { registerChatCompleteRoute } from './routes/chat_complete';
import { registerConnectorsRoute } from './routes/connectors';
import type {
  ConfigSchema,
  InferenceServerSetup,
  InferenceServerStart,
  InferenceSetupDependencies,
  InferenceStartDependencies,
} from './types';

export class InferencePlugin
  implements
    Plugin<
      InferenceServerSetup,
      InferenceServerStart,
      InferenceSetupDependencies,
      InferenceStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>,
    pluginsSetup: InferenceSetupDependencies
  ): InferenceServerSetup {
    const router = coreSetup.http.createRouter();

    registerChatCompleteRoute({
      router,
      coreSetup,
    });

    registerConnectorsRoute({
      router,
      coreSetup,
    });
    return {};
  }

  start(core: CoreStart, pluginsStart: InferenceStartDependencies): InferenceServerStart {
    return {
      getClient: ({ request }) => {
        return createInferenceClient({ request, actions: pluginsStart.actions });
      },
    };
  }
}
