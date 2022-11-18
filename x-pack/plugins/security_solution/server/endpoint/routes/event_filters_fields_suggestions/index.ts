/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import moment from 'moment';
import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { getKbnServerError, reportServerError } from '@kbn/kibana-utils-plugin/server';
import type { ConfigSchema } from '@kbn/unified-search-plugin/config';
import { termsEnumSuggestions } from '@kbn/unified-search-plugin/server/autocomplete/terms_enum';

export function registerEventFiltersFieldsSuggestionsRoutes(
  router: IRouter,
  config$: Observable<ConfigSchema>
) {
  router.post(
    {
      // TODO: Use a const for this
      path: '/api/endpoint/eventFiltersFieldsSuggestions',
      validate: {
        body: schema.object(
          {
            field: schema.string(),
            query: schema.string(),
            filters: schema.maybe(schema.any()),
            fieldMeta: schema.maybe(schema.any()),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async (context, request, response) => {
      // TODO: Add event filters RBAC checks
      const config = await firstValueFrom(config$);
      const { field: fieldName, query, filters, fieldMeta } = request.body;
      // TODO: add this as a query param if this is needed for endpoints list
      const index = 'logs-endpoint.events.*';
      const abortSignal = getRequestAbortedSignal(request.events.aborted$);
      const { savedObjects, elasticsearch } = await context.core;

      try {
        const body = await termsEnumSuggestions(
          config,
          savedObjects.client,
          elasticsearch.client.asInternalUser,
          index,
          fieldName,
          query,
          filters,
          fieldMeta,
          abortSignal
        );
        return response.ok({ body });
      } catch (e) {
        const kbnErr = getKbnServerError(e);
        return reportServerError(response, kbnErr);
      }
    }
  );
}
