/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Observable } from 'rxjs';
import type {
  ChatCompleteAPI,
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
} from '../../common/chat_complete';

type Connector = Awaited<ReturnType<ActionsClient['get']>>;

export interface InferenceConnectorAdapter {
  chatComplete: (
    options: Omit<Parameters<ChatCompleteAPI>[0], 'connectorId'> & {
      actionsClient: ActionsClient;
      connector: Connector;
    }
  ) => Observable<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>;
}
