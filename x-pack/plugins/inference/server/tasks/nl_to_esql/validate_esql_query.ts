/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-validation-autocomplete';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ESQLSearchResponse, ESQLRow } from '@kbn/es-types';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import { DatatableColumn, DatatableColumnType } from '@kbn/expressions-plugin/common';
import { splitIntoCommands } from '../../../common/tasks/nl_to_esql/correct_common_esql_mistakes';

export async function runAndValidateEsqlQuery({
  query,
  client,
}: {
  query: string;
  client: ElasticsearchClient;
}): Promise<{
  columns?: DatatableColumn[];
  rows?: ESQLRow[];
  error?: Error;
  errorMessages?: string[];
}> {
  const { errors } = await validateQuery(query, getAstAndSyntaxErrors, {
    // setting this to true, we don't want to validate the index / fields existence
    ignoreOnMissingCallbacks: true,
  });

  const asCommands = splitIntoCommands(query);

  const errorMessages = errors?.map((error) => {
    if ('location' in error) {
      const commandsUntilEndOfError = splitIntoCommands(query.substring(0, error.location.max));
      const lastCompleteCommand = asCommands[commandsUntilEndOfError.length - 1];
      if (lastCompleteCommand) {
        return `Error in ${lastCompleteCommand.command}\n: ${error.text}`;
      }
    }
    return 'text' in error ? error.text : error.message;
  });

  return client.transport
    .request({
      method: 'POST',
      path: '_query',
      body: {
        query,
      },
    })
    .then((res) => {
      const esqlResponse = res as ESQLSearchResponse;

      const columns =
        esqlResponse.columns?.map(({ name, type }) => ({
          id: name,
          name,
          meta: { type: esFieldTypeToKibanaFieldType(type) as DatatableColumnType },
        })) ?? [];

      return { columns, rows: esqlResponse.values };
    })
    .catch((error) => {
      return {
        error,
        ...(errorMessages.length ? { errorMessages } : {}),
      };
    });
}
