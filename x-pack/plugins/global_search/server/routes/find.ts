/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reduce, map } from 'rxjs/operators';
import { schema } from '@kbn/config-schema';
import { GlobalSearchRouter } from '../types';
import { GlobalSearchFindError } from '../../common/errors';

export const registerInternalFindRoute = (router: GlobalSearchRouter) => {
  router.post(
    {
      path: '/internal/global_search/find',
      validate: {
        body: schema.object({
          params: schema.object({
            term: schema.maybe(schema.string()),
            types: schema.maybe(schema.arrayOf(schema.string())),
            tags: schema.maybe(schema.arrayOf(schema.string())),
          }),
          options: schema.maybe(
            schema.object({
              preference: schema.maybe(schema.string()),
            })
          ),
        }),
      },
    },
    async (ctx, req, res) => {
      const { params, options } = req.body;
      try {
        const globalSearch = await ctx.globalSearch;
        const allResults = await globalSearch
          .find(params, { ...options, aborted$: req.events.aborted$ })
          .pipe(
            map((batch) => batch.results),
            reduce((acc, results) => [...acc, ...results])
          )
          .toPromise();
        return res.ok({
          body: {
            results: allResults,
          },
        });
      } catch (e) {
        if (e instanceof GlobalSearchFindError && e.type === 'invalid-license') {
          return res.forbidden({ body: e.message });
        }
        throw e;
      }
    }
  );
};
