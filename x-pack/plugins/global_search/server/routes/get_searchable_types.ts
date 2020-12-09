/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';

export const registerInternalSearchableTypesRoute = (router: IRouter) => {
  router.get(
    {
      path: '/internal/global_search/searchable_types',
      validate: false,
    },
    async (ctx, req, res) => {
      const types = await ctx.globalSearch!.getSearchableTypes();
      return res.ok({
        body: {
          types,
        },
      });
    }
  );
};
