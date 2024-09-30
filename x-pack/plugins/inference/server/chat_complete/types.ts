/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
  FunctionCallingMode,
  Message,
} from '../../common/chat_complete';
import type { ToolOptions } from '../../common/chat_complete/tools';
import type { InferenceExecutor } from './utils';

/**
 * Adapter in charge of communicating with a specific inference connector
 * and to convert inputs/outputs from/to the common chatComplete inference format.
 *
 * @internal
 */
export interface InferenceConnectorAdapter {
  chatComplete: (
    options: {
      executor: InferenceExecutor;
      messages: Message[];
      system?: string;
      functionCalling?: FunctionCallingMode;
      logger: Logger;
    } & ToolOptions
  ) => Observable<InferenceConnectorAdapterChatCompleteEvent>;
}

/**
 * Events that can be emitted by the observable returned from {@link InferenceConnectorAdapter.chatComplete}
 *
 * @internal
 */
export type InferenceConnectorAdapterChatCompleteEvent =
  | ChatCompletionChunkEvent
  | ChatCompletionTokenCountEvent;
