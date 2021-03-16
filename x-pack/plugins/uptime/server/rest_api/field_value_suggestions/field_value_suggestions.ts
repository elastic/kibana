/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { getFieldValueSuggestion } from '../../lib/requests/get_field_value_suggestions';

export const createGetFieldValueSuggestionsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'POST',
  path: '/api/uptime/suggestions/values/{index}',
  validate: {
    params: schema.object(
      {
        index: schema.string(),
      },
      { unknowns: 'allow' }
    ),
    body: schema.object(
      {
        field: schema.string(),
        query: schema.string(),
        filters: schema.maybe(schema.any()),
        fieldType: schema.maybe(schema.string()),
        useTimeRange: schema.maybe(schema.boolean()),
      },
      { unknowns: 'allow' }
    ),
  },
  handler: async ({ uptimeEsClient, request }): Promise<any> => {
    const { field: fieldName, query, filters, fieldType, useTimeRange } = request.body;
    const { index } = request.params;

    return getFieldValueSuggestion({
      uptimeEsClient,
      index,
      fieldName,
      fieldType,
      query,
      filters,
      useTimeRange,
    });
  },
});
