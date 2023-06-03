/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import {
  type CoPilotPromptId,
  type PromptParamsOf,
  type CreateChatCompletionResponseChunk,
} from '../../common/co_pilot';

export interface PromptObservableState {
  chunks: CreateChatCompletionResponseChunk[];
  message?: string;
  loading: boolean;
}

export interface CoPilotService {
  isEnabled: () => boolean;
  prompt<TPromptId extends CoPilotPromptId>(
    promptId: TPromptId,
    params: PromptParamsOf<TPromptId>
  ): Observable<PromptObservableState>;
}
