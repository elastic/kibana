/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginStartContract as ActionsPluginStart,
  PluginSetupContract as ActionsPluginSetup,
} from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { StaticChatCompleteOptions } from '@kbn/inference-common';
import type { InferenceClient, BoundInferenceClient } from './inference_client';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface InferenceSetupDependencies {
  actions: ActionsPluginSetup;
}

export interface InferenceStartDependencies {
  actions: ActionsPluginStart;
}

export interface InferenceServerSetup {}

export interface InferenceClientCreateOptions<T extends StaticChatCompleteOptions | undefined> {
  request: KibanaRequest;
  bindTo?: T;
}

export interface InferenceServerStart {
  /**
   * Creates an inference client, scoped to a request.
   *
   * @param options {@link InferenceClientCreateOptions}
   * @returns {@link InferenceClient}
   */
  getClient: <T extends StaticChatCompleteOptions | undefined>(
    options: InferenceClientCreateOptions<T>
  ) => T extends StaticChatCompleteOptions ? BoundInferenceClient : InferenceClient;
}
