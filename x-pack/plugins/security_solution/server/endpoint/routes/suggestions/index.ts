/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { getKbnServerError, reportServerError } from '@kbn/kibana-utils-plugin/server';
import type { ConfigSchema } from '@kbn/unified-search-plugin/config';
import { termsEnumSuggestions } from '@kbn/unified-search-plugin/server/autocomplete/terms_enum';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { SUGGESTIONS_ROUTE } from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';

export const EndpointSuggestonsSchema = {
  body: schema.object(
    {
      field: schema.string(),
      query: schema.string(),
      filters: schema.maybe(schema.any()),
      fieldMeta: schema.maybe(schema.any()),
    },
    { unknowns: 'forbid' }
  ),
  params: schema.object({
    // Ready to be used with other suggestion types like endpoints
    suggestion_type: schema.oneOf([schema.literal('eventFilters')]),
  }),
};

export function registerEndpointSuggestionsRoutes(
  router: SecuritySolutionPluginRouter,
  config$: Observable<ConfigSchema>,
  endpointContext: EndpointAppContext
) {
  router.post(
    {
      path: SUGGESTIONS_ROUTE,
      validate: EndpointSuggestonsSchema,
    },
    withEndpointAuthz(
      { any: ['canWriteEventFilters'] },
      endpointContext.logFactory.get('endpointSuggestions'),
      getEndpointSuggestionsRequestHandler(config$)
    )
  );
}

export const getEndpointSuggestionsRequestHandler = (
  config$: Observable<ConfigSchema>
): RequestHandler<
  TypeOf<typeof EndpointSuggestonsSchema.params>,
  never,
  never,
  SecuritySolutionRequestHandlerContext
> => {
  return async (context, request, response) => {
    const config = await firstValueFrom(config$);
    const { field: fieldName, query, filters, fieldMeta } = request.body;
    let index = '';

    if (request.params.suggestion_type === 'eventFilters') {
      index = 'logs-endpoint.events.*';
    } else {
      return response.badRequest({
        body: `Invalid suggestion_type: ${request.params.suggestion_type}`,
      });
    }

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
  };
};
