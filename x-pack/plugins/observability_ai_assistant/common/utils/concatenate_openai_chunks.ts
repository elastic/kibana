/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { type Observable, scan } from 'rxjs';
import { type CreateChatCompletionResponseChunk, MessageRole } from '../types';

export const concatenateOpenAiChunks =
  () =>
  (
    source: Observable<CreateChatCompletionResponseChunk>
  ): Observable<{
    message: {
      content: string;
      role: MessageRole;
      function_call: {
        name: string;
        arguments: string;
        trigger: MessageRole.Assistant | MessageRole.User;
      };
    };
  }> =>
    source.pipe(
      scan(
        (acc, { choices }) => {
          acc.message.content += choices[0].delta.content ?? '';
          acc.message.function_call.name += choices[0].delta.function_call?.name ?? '';
          acc.message.function_call.arguments += choices[0].delta.function_call?.arguments ?? '';
          return cloneDeep(acc);
        },
        {
          message: {
            content: '',
            function_call: {
              name: '',
              arguments: '',
              trigger: MessageRole.Assistant as const,
            },
            role: MessageRole.Assistant,
          },
        }
      )
    );
