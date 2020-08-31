/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { EndpointAppContext } from '../../types';

export const registerTrustedAppsRoutes = (
  router: IRouter,
  endpointAppContext: EndpointAppContext
) => {
  // GET list
  router.get(
    {
      path: '/api/endpoint/trusted_apps',
      validate: {
        query: schema.object({
          page: schema.maybe(schema.number({ defaultValue: 1, min: 1 })),
          per_page: schema.maybe(schema.number({ defaultValue: 20, min: 1 })),
        }),
      },
      options: { authRequired: true },
    },
    async (context, req, res) => {
      const page = req.query.page || 1;
      const perPage = req.query.per_page || 20;

      return res.ok({
        body: {
          data: [...Array(perPage).keys()].map((number) => ({
            name: `trusted app ${(page - 1) * perPage + number}`,
            description: `Trusted application ${(page - 1) * perPage + number}`,
            os: ['windows', 'mac', 'linux'][number % 3],
            entries: [],
            created_at: 'Aug 28, 2020 @12:00:00.000',
            created_by: 'Bohdan Tsymbala',
          })),
          total: 100,
          page,
          per_page: perPage!,
        },
      });
    }
  );
};
