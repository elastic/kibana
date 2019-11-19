/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';

export function registerEndpointsApi(router: IRouter) {
  const endpointsHandler = async (context, req, res) => {
    try {
      if (!context.endpointPlugin) return res.internalError({ body: 'endpointPlugin is disabled' });
      if ('id' in req.params) {
        const endpointId = req.params.id as string;
        const response = await context.endpointPlugin.findEndpoint(endpointId);
        return res.ok({ body: response });
      } else {
        const response = await context.endpointPlugin.findLatestOfAllEndpoints();
        return res.ok({ body: response });
      }
    } catch (err) {
      return res.internalError({ body: err });
    }
  };

  router.get(
    {
      path: '/api/endpoint/endpoints/{id}',
      validate: {
        params: schema.object({ id: schema.string() }),
      },
      options: { authRequired: false },
    },
    async (context, req, res) => endpointsHandler(context, req, res)
  );

  router.get(
    {
      path: '/api/endpoint/endpoints',
      validate: {},
      options: { authRequired: false },
    },
    async (context, req, res) => endpointsHandler(context, req, res)
  );
}
