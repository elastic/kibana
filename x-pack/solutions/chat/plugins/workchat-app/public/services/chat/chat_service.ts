/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, catchError, throwError } from 'rxjs';
import { isSSEError } from '@kbn/sse-utils';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { HttpSetup } from '@kbn/core/public';
import { ChatEvent } from '../../../common/chat_events';
import { createChatError, ChatErrorCode } from '../../../common/errors';

interface ConverseParams {
  conversationId?: string;
  connectorId?: string;
  agentId: string;
  nextMessage: string;
}

export class ChatService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  converse({ nextMessage, conversationId, agentId, connectorId }: ConverseParams) {
    return defer(() => {
      return this.http.post('/internal/workchat/chat', {
        asResponse: true,
        rawResponse: true,
        body: JSON.stringify({ nextMessage, conversationId, agentId, connectorId }),
      });
    }).pipe(
      // @ts-expect-error SseEvent mixin issue
      httpResponseIntoObservable<ChatEvent>(),
      catchError((err) => {
        if (isSSEError(err)) {
          return throwError(() =>
            createChatError(err.code as ChatErrorCode, err.message, err.meta)
          );
        }
        return throwError(() => err);
      })
    );
  }
}
