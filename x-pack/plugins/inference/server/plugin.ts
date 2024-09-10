/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { createInferenceClient } from './inference_client';
import { registerRoutes } from './routes';
import type { InferenceConfig } from './config';
import type {
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
  private logger: Logger;

  constructor(context: PluginInitializerContext<InferenceConfig>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>,
    pluginsSetup: InferenceSetupDependencies
  ): InferenceServerSetup {
    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
    });

    return {};
  }

  start(core: CoreStart, pluginsStart: InferenceStartDependencies): InferenceServerStart {
    return {
      getClient: ({ request }) => {
        return createInferenceClient({
          request,
          actions: pluginsStart.actions,
          logger: this.logger.get('client'),
        });
      },
    };
  }
}
