/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { EndpointRequestContext } from '../handlers/endpoint_handler';
import { endpointRequestSchema } from '../services/query/endpoint_query_builder';

export function registerEndpointRoutes(router: IRouter, endpointHandler: EndpointRequestContext) {
  router.get(
    {
      path: '/api/endpoint/endpoints/{id}',
      validate: {
        params: schema.object({ id: schema.string() }),
      },
      options: { authRequired: true },
    },
    async (context, req, res) => {
      try {
        const response = await endpointHandler.findEndpoint(req.params.id, req);
        return res.ok({ body: response });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );

  router.post(
    {
      path: '/api/endpoint/endpoints',
      validate: endpointRequestSchema,
      options: { authRequired: true },
    },
    async (context, req, res) => {
      try {
        const response = await endpointHandler.findLatestOfAllEndpoints(req);
        return res.ok({ body: response });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );
}
