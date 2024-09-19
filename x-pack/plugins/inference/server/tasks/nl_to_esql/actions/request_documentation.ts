/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, tap, map } from 'rxjs';
import { InferenceClient, withoutOutputUpdateEvents } from '../../..';
import { Message } from '../../../../common';
import { EsqlDocumentBase } from '../doc_base';
import type { FunctionCallingMode } from '../../../../common/chat_complete';
import { requestDocumentationSchema } from './shared';
import type { ActionsOptionsBase } from './types';

export const requestDocumentationFn = ({
  client,
  system,
  connectorId,
  functionCalling,
  docBase,
  logger,
  output$,
}: ActionsOptionsBase & {
  docBase: EsqlDocumentBase;
  system: string;
}) => {
  return async ({ messages }: { messages: Message[] }) => {
    const result = await lastValueFrom(
      client
        .output('request_documentation', {
          connectorId,
          functionCalling,
          system,
          previousMessages: messages,
          input: `Based on the previous conversation, request documentation
        for commands or functions listed in the ES|QL handbook to help you
        get the right information needed to generate a query.

        Make sure to request documentation for any command or function you think you may use,
        even if you end up not using all of them.

        Example: if you need to...
        - Group or aggregate data? Request \`STATS\`.
        - Extract data? Request \`DISSECT\` and \`GROK\`.
        - Convert a column based on a set of conditionals? Request \`EVAL\` and \`CASE\`.
        - Group data by time intervals? Request \`BUCKET\`
      `,
          schema: requestDocumentationSchema,
        })
        .pipe(
          withoutOutputUpdateEvents(),
          map((event) => {
            const keywords = [...(event.output.commands ?? []), ...(event.output.functions ?? [])];
            const requestedDocumentation = docBase.getDocumentation(keywords);
            return {
              ...event,
              output: {
                keywords,
                requestedDocumentation,
              },
            };
          }),
          tap((event) => {
            output$.next(event);
          })
        )
    );

    return result.output;
  };
};
