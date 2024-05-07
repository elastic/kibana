/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { VisualizeESQLUserIntention } from '@kbn/observability-ai-assistant-plugin/common/functions/visualize_esql';
import { visualizeESQLFunction } from '../../common/functions/visualize_esql';
import { FunctionRegistrationParameters } from '.';
import { validateEsqlQuery } from './query/validate_esql_query';

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
  functions.registerFunction(visualizeESQLFunction, async ({ arguments: { query, intention } }) => {
    const { columns, errorMessages } = await validateEsqlQuery({
      query,
      client: (await resources.context.core).elasticsearch.client.asCurrentUser,
    });

    const message = getMessageForLLM(intention, query, Boolean(errorMessages?.length));

    return {
      data: {
        columns,
      },
      content: {
        message,
        errorMessages,
      },
    };
  });
}
