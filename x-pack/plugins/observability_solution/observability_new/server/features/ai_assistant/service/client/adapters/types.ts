/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'node:stream';
import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { Message } from '../../../../../../common/features/ai_assistant';
import type { ChatCompletionChunkEvent } from '../../../../../../common/features/ai_assistant/conversation_complete';
import type { CompatibleJSONSchema } from '../../../../../../common/features/ai_assistant/types';

export type LlmApiAdapterFactory = (options: {
  logger: Logger;
  messages: Message[];
  functions?: Array<{ name: string; description: string; parameters: CompatibleJSONSchema }>;
  functionCall?: string;
}) => LlmApiAdapter;

export interface LlmApiAdapter {
  getSubAction: () => { subAction: string; subActionParams: Record<string, any> };
  streamIntoObservable: (readable: Readable) => Observable<ChatCompletionChunkEvent>;
}
