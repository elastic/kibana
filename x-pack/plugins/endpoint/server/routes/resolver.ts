/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';
import { EndpointAppContext, EndpointData } from '../types';
import { events } from '../test_data/events';

export function registerResolverRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  router.get(
    {
      path: '/api/endpoint/resolver',
      validate: {
        query: schema.object({
          uniquePid: schema.number(),
        }),
      },
      options: { authRequired: true },
    },
    async (context, req, res) => {
      const uniquePid = req.query.uniquePid;
      const origin = events.find(event => event.entityID === uniquePid);
      const ancestor = events.find(event => event.parentEntityID === uniquePid);
      const children = events.filter(event => event.entityID === origin?.entityID);
      try {
        return res.ok({
          body: {
            ancestor,
            origin,
            children: [...children],
          },
        });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );
}
