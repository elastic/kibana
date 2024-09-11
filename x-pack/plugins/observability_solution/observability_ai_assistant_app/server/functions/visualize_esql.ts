/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { VisualizeESQLUserIntention } from '@kbn/observability-ai-assistant-plugin/common/functions/visualize_esql';
import {
  visualizeESQLFunction,
  type VisualizeQueryResponsev1,
} from '../../common/functions/visualize_esql';
import type { FunctionRegistrationParameters } from '.';
import { runAndValidateEsqlQuery } from './query/validate_esql_query';

const getMessageForLLM = (
  intention: VisualizeESQLUserIntention,
  query: string,
  hasErrors: boolean
) => {
  if (hasErrors) {
    return 'The query has syntax errors';
  }
  return intention === VisualizeESQLUserIntention.executeAndReturnResults ||
    intention === VisualizeESQLUserIntention.generateQueryOnly
    ? 'These results are not visualized'
    : 'Only following query is visualized: ```esql\n' + query + '\n```';
};

export function registerVisualizeESQLFunction({
  functions,
  resources,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    visualizeESQLFunction,
    async ({ arguments: { query, intention } }): Promise<VisualizeQueryResponsev1> => {
      // errorMessages contains the syntax errors from the client side valdation
      // error contains the error from the server side validation, it is always one error
      // and help us identify errors like index not found, field not found etc.
      const { columns, errorMessages, rows, error } = await runAndValidateEsqlQuery({
        query,
        client: (await resources.context.core).elasticsearch.client.asCurrentUser,
      });

      const message = getMessageForLLM(intention, query, Boolean(errorMessages?.length));

      return {
        data: {
          columns: columns ?? [],
          rows: rows ?? [],
        },
        content: {
          message,
          errorMessages: [
            ...(errorMessages ? errorMessages : []),
            ...(error ? [error.message] : []),
          ],
        },
      };
    },
    ['all']
  );
}
