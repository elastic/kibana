/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { createOutputApi } from '../common/output/create_output_api';
import { createChatCompleteApi } from './chat_complete';
import type {
  ConfigSchema,
  InferencePublicSetup,
  InferencePublicStart,
  InferenceSetupDependencies,
  InferenceStartDependencies,
} from './types';

export class InferencePlugin
  implements
    Plugin<
      InferencePublicSetup,
      InferencePublicStart,
      InferenceSetupDependencies,
      InferenceStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<InferenceStartDependencies, InferencePublicStart>,
    pluginsSetup: InferenceSetupDependencies
  ): InferencePublicSetup {
    return {};
  }

  start(coreStart: CoreStart, pluginsStart: InferenceStartDependencies): InferencePublicStart {
    const chatComplete = createChatCompleteApi({ http: coreStart.http });
    return {
      chatComplete,
      output: createOutputApi(chatComplete),
      getConnectors: () => {
        return coreStart.http.get('/internal/inference/connectors');
      },
    };
  }
}
