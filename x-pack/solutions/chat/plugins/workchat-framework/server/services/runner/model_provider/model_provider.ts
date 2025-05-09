/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/wc-framework-types-server';
import { getConnectorList, getDefaultConnector } from '@kbn/wc-genai-utils';
import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';

export interface ModelProviderFactoryArgs {
  request: KibanaRequest;
  defaultConnectorId?: string;
}

export type ModelProviderFactory = (args: ModelProviderFactoryArgs) => Promise<ModelProvider>;

/**
 * Utility HOF function to bind the dependencies to create a {@link ModelProviderFactory}.
 */
export const createModelProviderFactory =
  ({
    inference,
    actions,
  }: {
    inference: InferenceServerStart;
    actions: ActionsPluginStart;
  }): ModelProviderFactory =>
  async ({ request, defaultConnectorId }) => {
    let connectorId = defaultConnectorId;
    if (!connectorId) {
      const connectors = await getConnectorList({ actions, request });
      const defaultConnector = getDefaultConnector({ connectors });
      connectorId = defaultConnector.connectorId;
    }

    const chatModel = await inference.getChatModel({ request, connectorId, chatModelOptions: {} });

    return {
      getDefaultModel: () => chatModel,
    };
  };
