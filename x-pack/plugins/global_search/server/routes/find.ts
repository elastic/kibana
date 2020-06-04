/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reduce, map } from 'rxjs/operators';
import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { GlobalSearchFindError } from '../../common/errors';

export const registerInternalFindRoute = (router: IRouter) => {
  router.post(
    {
      path: '/internal/global_search/find',
      validate: {
        body: schema.object({
          term: schema.string(),
          options: schema.maybe(
            schema.object({
              preference: schema.maybe(schema.string()),
            })
          ),
        }),
      },
    },
    async (ctx, req, res) => {
      const { term, options } = req.body;
      try {
        const allResults = await ctx
          .globalSearch!.find(term, { ...options, aborted$: req.events.aborted$ })
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
