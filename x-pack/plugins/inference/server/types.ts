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
  chatComplete: ChatCompleteAPI;
  output: OutputAPI;
  getConnectorById: (id: string) => Promise<InferenceConnector>;
}

export interface InferenceServerStart {
  getClient: (options: { request: KibanaRequest }) => InferenceClient;
}
