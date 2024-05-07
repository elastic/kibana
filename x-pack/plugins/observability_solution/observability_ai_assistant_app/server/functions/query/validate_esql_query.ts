/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-validation-autocomplete';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ESQL_LATEST_VERSION } from '@kbn/esql-utils';
import { ESQLSearchReponse } from '@kbn/es-types';
import { esFieldTypeToKibanaFieldType, type KBN_FIELD_TYPES } from '@kbn/field-types';

export async function validateEsqlQuery({
  query,
  client,
}: {
  query: string;
  client: ElasticsearchClient;
}): Promise<{
  columns?: Array<{
    id: string;
    name: string;
    meta: {
      type: KBN_FIELD_TYPES;
    };
  }>;
  error?: Error;
  errorMessages?: string[];
}> {
  const { errors } = await validateQuery(query, getAstAndSyntaxErrors, {
    // setting this to true, we don't want to validate the index / fields existence
    ignoreOnMissingCallbacks: true,
  });

  const errorMessages = errors?.map((error) => {
    return 'text' in error ? error.text : error.message;
  });

  // With limit 0 I get only the columns, it is much more performant
  const performantQuery = `${query} | limit 0`;

  return client.transport
    .request({
      method: 'POST',
      path: '_query',
      body: {
        query: performantQuery,
        version: ESQL_LATEST_VERSION,
      },
    })
    .then((res) => {
      const esqlResponse = res as ESQLSearchReponse;

      const columns =
        esqlResponse.columns?.map(({ name, type }) => ({
          id: name,
          name,
          meta: { type: esFieldTypeToKibanaFieldType(type) },
        })) ?? [];

      return { columns };
    })
    .catch((error) => {
      return {
        error,
        errorMessages,
      };
    });
}
