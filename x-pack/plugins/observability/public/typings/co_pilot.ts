/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionRequestMessage } from 'openai';
import type { Observable } from 'rxjs';
import type {
  CoPilotPromptId,
  PromptParamsOf,
  CreateChatCompletionResponseChunk,
} from '../../common/co_pilot';

export interface PromptObservableState {
  chunks: CreateChatCompletionResponseChunk[];
  message?: string;
  messages: ChatCompletionRequestMessage[];
  loading: boolean;
}

export interface CoPilotService {
  isEnabled: () => boolean;
  prompt<TPromptId extends CoPilotPromptId>(
    promptId: TPromptId,
    params: PromptParamsOf<TPromptId>
  ): Observable<PromptObservableState>;
  submitFeedback: (options: {
    messages: ChatCompletionRequestMessage[];
    response: string;
    promptId: CoPilotPromptId;
    positive: boolean;
    responseTime: number;
  }) => Promise<void>;
}
