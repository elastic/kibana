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
import type { BoundChatCompleteOptions } from '@kbn/inference-common';
import type { InferenceClient, BoundInferenceClient } from './inference_client';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface InferenceSetupDependencies {
  actions: ActionsPluginSetup;
}

export interface InferenceStartDependencies {
  actions: ActionsPluginStart;
}

/**
 * Setup contract of the inference plugin.
 */
export interface InferenceServerSetup {}

/**
 * Options to create an inference client using the {@link InferenceServerStart.getClient} API.
 */
export interface InferenceUnboundClientCreateOptions {
  /**
   * The request to scope the client to.
   */
  request: KibanaRequest;
}

/**
 * Options to create a bound inference client using the {@link InferenceServerStart.getClient} API.
 */
export interface InferenceBoundClientCreateOptions extends InferenceUnboundClientCreateOptions {
  /**
   * The parameters to bind the client to.
   */
  bindTo: BoundChatCompleteOptions;
}

/**
 * Options to create an inference client using the {@link InferenceServerStart.getClient} API.
 */
export type InferenceClientCreateOptions =
  | InferenceUnboundClientCreateOptions
  | InferenceBoundClientCreateOptions;

/**
 * Start contract of the inference plugin, exposing APIs to interact with LLMs.
 */
export interface InferenceServerStart {
  /**
   * Creates an {@link InferenceClient}, scoped to a request.
   *
   * @example
   * ```ts
   * const inferenceClient = myStartDeps.inference.getClient({ request });
   *
   * const chatResponse = inferenceClient.chatComplete({
   *   connectorId: 'my-connector-id',
   *   messages: [{ role: MessageRole.User, content: 'Do something' }],
   * });
   * ```
   *
   * It is also possible to bind a client to its configuration parameters, to avoid passing connectorId
   * to every call, for example. Defining the `bindTo` parameter will return a {@link BoundInferenceClient}
   *
   * @example
   * ```ts
   * const inferenceClient = myStartDeps.inference.getClient({
   *   request,
   *   bindTo: {
   *    connectorId: 'my-connector-id',
   *    functionCalling: 'simulated',
   *   }
   * });
   *
   * const chatResponse = inferenceClient.chatComplete({
   *   messages: [{ role: MessageRole.User, content: 'Do something' }],
   * });
   * ```
   */
  getClient: <T extends InferenceClientCreateOptions>(
    options: T
  ) => T extends InferenceBoundClientCreateOptions ? BoundInferenceClient : InferenceClient;
}
