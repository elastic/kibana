/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  ChatCompletionChunkEvent,
  ChatCompletionMessageEvent,
  FunctionCallingMode,
  Message,
} from '../../../common/chat_complete';
import type { ToolOptions } from '../../../common/chat_complete/tools';
import type { OutputCompleteEvent } from '../../../common/output';
import type { InferenceClient } from '../../types';

export type NlToEsqlTaskEvent<TToolOptions extends ToolOptions> =
  | OutputCompleteEvent<
      'request_documentation',
      { keywords: string[]; requestedDocumentation: Record<string, string> }
    >
  | ChatCompletionChunkEvent
  | ChatCompletionMessageEvent<TToolOptions>;

export type NlToEsqlTaskParams<TToolOptions extends ToolOptions> = {
  client: Pick<InferenceClient, 'output' | 'chatComplete'>;
  connectorId: string;
  logger: Pick<Logger, 'debug'>;
  functionCalling?: FunctionCallingMode;
  system?: string;
} & TToolOptions &
  ({ input: string } | { messages: Message[] });
