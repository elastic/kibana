/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import type { ESQLSearchReponse } from '@kbn/es-types';
import { validateQuery } from '@kbn/esql-validation-autocomplete';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { VisualizeESQLUserIntention } from '@kbn/observability-ai-assistant-plugin/common/functions/visualize_esql';
import { visualizeESQLFunction } from '../../common/functions/visualize_esql';
import { FunctionRegistrationParameters } from '.';

const getSystemMessage = (
  intention: VisualizeESQLUserIntention,
  query: string,
  queryErrors: string[]
) => {
  if (queryErrors.length) {
    return 'The query has syntax errors: ```\n' + queryErrors + '\n```';
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
    async ({ arguments: { query, intention }, connectorId, messages }, signal) => {
      const { errors } = await validateQuery(query, getAstAndSyntaxErrors, {
        ignoreOnMissingCallbacks: true,
      });
      const errorMessages = errors?.map((error) => {
        return 'text' in error ? error.text : error.message;
      });
      // With limit 0 I get only the columns, it is much more performant
      const performantQuery = `${query} | limit 0`;
      const coreContext = await resources.context.core;

      const response = (await (
        await coreContext
      ).elasticsearch.client.asCurrentUser.transport.request({
        method: 'POST',
        path: '_query',
        body: {
          query: performantQuery,
        },
      })) as ESQLSearchReponse;
      const columns =
        response.columns?.map(({ name, type }) => ({
          id: name,
          name,
          meta: { type: esFieldTypeToKibanaFieldType(type) },
        })) ?? [];

      const message = getSystemMessage(intention, query, errorMessages);

      return {
        data: {
          columns,
          errorMessages,
        },
        content: {
          message,
        },
      };
    }
  );
}
