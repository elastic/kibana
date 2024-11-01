/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import type { HttpStart } from '@kbn/core/public';
import {
  ChatCompleteAPI,
  ChatCompleteOptions,
  ChatCompleteCompositeResponse,
  ToolOptions,
} from '@kbn/inference-common';
import type { ChatCompleteRequestBody } from '../common/http_apis';
import { httpResponseIntoObservable } from './util/http_response_into_observable';

export function createChatCompleteApi({ http }: { http: HttpStart }): ChatCompleteAPI {
  return <TToolOptions extends ToolOptions = ToolOptions, TStream extends boolean = false>({
    connectorId,
    messages,
    system,
    toolChoice,
    tools,
    functionCalling,
    stream,
  }: ChatCompleteOptions<TToolOptions, TStream>) => {
    const body: ChatCompleteRequestBody = {
      connectorId,
      system,
      messages,
      toolChoice,
      tools,
      functionCalling,
    };

    if (stream) {
      return from(
        http.post('/internal/inference/chat_complete/stream', {
          asResponse: true,
          rawResponse: true,
          body: JSON.stringify(body),
        })
      ).pipe(httpResponseIntoObservable()) as ChatCompleteCompositeResponse<TToolOptions, TStream>;
    } else {
      return http.post('/internal/inference/chat_complete', {
        body: JSON.stringify(body),
      }) as ChatCompleteCompositeResponse<TToolOptions, TStream>;
    }
  };
}
