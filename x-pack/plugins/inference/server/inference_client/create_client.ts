/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { BoundChatCompleteOptions } from '@kbn/inference-common';
import type { InferenceClientCreateOptions } from '../types';
import type { BoundInferenceClient, InferenceClient } from './types';
import { createInferenceClient } from './inference_client';
import { bindClient } from './bind_client';

export function createClient<T extends BoundChatCompleteOptions | undefined>(
  options: InferenceClientCreateOptions<T> & {
    actions: ActionsPluginStart;
    logger: Logger;
  }
): T extends BoundChatCompleteOptions ? BoundInferenceClient : InferenceClient;
export function createClient<T extends BoundChatCompleteOptions | undefined>({
  actions,
  request,
  logger,
  bindTo,
}: InferenceClientCreateOptions<T> & {
  actions: ActionsPluginStart;
  logger: Logger;
}): BoundInferenceClient | InferenceClient {
  const client = createInferenceClient({ request, actions, logger });
  if (bindTo) {
    return bindClient(client, bindTo);
  } else {
    return client;
  }
}
