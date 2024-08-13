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
import { ChatCompleteAPI } from '../common/chat_complete';
import { InferenceConnector } from '../common/connectors';
import { OutputAPI } from '../common/output';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface InferenceSetupDependencies {
  actions: ActionsPluginSetup;
}

export interface InferenceStartDependencies {
  actions: ActionsPluginStart;
}

export interface InferenceServerSetup {}

export interface InferenceClient {
  /**
   * `chatComplete` requests the LLM to generate a response to
   * a prompt or conversation, which might be plain text
   * or a tool call, or a combination of both.
   */
  chatComplete: ChatCompleteAPI;
  /**
   * `output` asks the LLM to generate a structured (JSON)
   * response based on a schema and a prompt or conversation.
   */
  output: OutputAPI;
  /**
   * `getConnectorById` returns an inference connector by id.
   * Non-inference connectors will throw an error.
   */
  getConnectorById: (id: string) => Promise<InferenceConnector>;
}

interface InferenceClientCreateOptions {
  request: KibanaRequest;
}

export interface InferenceServerStart {
  /**
   * Creates an inference client, scoped to a request.
   *
   * @param options {@link InferenceClientCreateOptions}
   * @returns {@link InferenceClient}
   */
  getClient: (options: InferenceClientCreateOptions) => InferenceClient;
}
