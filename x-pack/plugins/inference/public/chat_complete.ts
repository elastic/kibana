/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import {
  ChatCompleteAPI,
  ChatCompleteCompositeResponse,
  ChatCompleteOptions,
  ToolOptions,
} from '@kbn/inference-common';
import { from } from 'rxjs';
import type { ChatCompleteRequestBody } from '../common/http_apis';
import { httpResponseIntoObservable } from './util/http_response_into_observable';

export function createChatCompleteApi({ http }: { http: HttpStart }): ChatCompleteAPI;
export function createChatCompleteApi({ http }: { http: HttpStart }) {
  return ({
    connectorId,
    messages,
    system,
    toolChoice,
    tools,
    functionCalling,
    stream,
  }: ChatCompleteOptions<ToolOptions, boolean>): ChatCompleteCompositeResponse<
    ToolOptions,
    boolean
  > => {
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
      ).pipe(httpResponseIntoObservable());
    } else {
      return http.post('/internal/inference/chat_complete', {
        body: JSON.stringify(body),
      });
    }
  };
}
