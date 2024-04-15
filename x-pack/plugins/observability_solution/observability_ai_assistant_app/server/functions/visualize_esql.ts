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
import { ESQL_LATEST_VERSION } from '@kbn/esql-utils';
import { VisualizeESQLUserIntention } from '@kbn/observability-ai-assistant-plugin/common/functions/visualize_esql';
import { visualizeESQLFunction } from '../../common/functions/visualize_esql';
import { FunctionRegistrationParameters } from '.';

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
    async ({ arguments: { query, intention }, connectorId, messages }, signal) => {
      // recomputing the errors here as the user might click the Visualize query button
      // and call the function manually.
      const { errors } = await validateQuery(query, getAstAndSyntaxErrors, {
        // setting this to true, we don't want to validate the index / fields existence
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
          version: ESQL_LATEST_VERSION,
        },
      })) as ESQLSearchReponse;
      const columns =
        response.columns?.map(({ name, type }) => ({
          id: name,
          name,
          meta: { type: esFieldTypeToKibanaFieldType(type) },
        })) ?? [];

      const message = getMessageForLLM(intention, query, Boolean(errorMessages.length));

      return {
        data: {
          columns,
        },
        content: {
          message,
          errorMessages,
        },
      };
    }
  );
}
