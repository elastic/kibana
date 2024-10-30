/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import type { HttpStart } from '@kbn/core/public';
import type { ChatCompleteAPI } from '../../common/chat_complete';
import type { ChatCompleteRequestBody } from '../../common/chat_complete/request';
import { httpResponseIntoObservable } from '../util/http_response_into_observable';

export function createChatCompleteApi({ http }: { http: HttpStart }): ChatCompleteAPI {
  return ({ connectorId, messages, system, toolChoice, tools, functionCalling }) => {
    const body: ChatCompleteRequestBody = {
      connectorId,
      system,
      messages,
      toolChoice,
      tools,
      functionCalling,
    };

    return from(
      http.post('/internal/inference/chat_complete', {
        asResponse: true,
        rawResponse: true,
        body: JSON.stringify(body),
      })
    ).pipe(httpResponseIntoObservable());
  };
}
