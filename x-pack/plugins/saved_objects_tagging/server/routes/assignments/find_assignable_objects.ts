/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { FindAssignableObjectResponse } from '../../../common/http_api_types';

export const registerFindAssignableObjectsRoute = (router: IRouter) => {
  router.get(
    {
      path: '/internal/saved_objects_tagging/assignments/_find_assignable_objects',
      validate: {
        query: schema.object({
          search: schema.maybe(schema.string()),
          max_results: schema.number({ min: 0, defaultValue: 1000 }),
          types: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const { assignmentService } = ctx.tags!;
      const { query } = req;

      const results = await assignmentService.findAssignableObjects({
        search: query.search,
        types: typeof query.types === 'string' ? [query.types] : query.types,
        maxResults: query.max_results,
      });

      return res.ok({
        body: {
          objects: results,
        } as FindAssignableObjectResponse,
      });
    })
  );
};
