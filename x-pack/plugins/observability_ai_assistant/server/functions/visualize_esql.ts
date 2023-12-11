/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { castEsToKbnFieldTypeName, ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { visualizeESQLFunction } from '../../common/functions/visualize_esql';
import type { FunctionRegistrationParameters } from '.';

interface ESQLSearchReponse {
  columns: Array<{
    name: string;
    type: string;
  }>;
}

function normalizeType(type: string): DatatableColumnType {
  switch (type) {
    case ES_FIELD_TYPES._INDEX:
    case ES_FIELD_TYPES.GEO_POINT:
    case ES_FIELD_TYPES.IP:
      return KBN_FIELD_TYPES.STRING;
    case '_version':
      return KBN_FIELD_TYPES.NUMBER;
    case 'datetime':
      return KBN_FIELD_TYPES.DATE;
    default:
      return castEsToKbnFieldTypeName(type) as DatatableColumnType;
  }
}

export function registerVisualizeESQLFunction({
  client,
  registerFunction,
  resources,
}: FunctionRegistrationParameters) {
  registerFunction(
    visualizeESQLFunction,
    async ({ arguments: { query }, connectorId, messages }, signal) => {
      // With limit 0 I get only the columns
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
          meta: { type: normalizeType(type) },
        })) ?? [];
      return { content: columns };
    }
  );
}
