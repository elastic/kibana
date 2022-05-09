/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GlobalSearchRouter } from '../types';

export const registerInternalSearchableTypesRoute = (router: GlobalSearchRouter) => {
  router.get(
    {
      path: '/internal/global_search/searchable_types',
      validate: false,
    },
    async (ctx, req, res) => {
      const globalSearch = await ctx.globalSearch;
      const types = await globalSearch.getSearchableTypes();
      return res.ok({
        body: {
          types,
        },
      });
    }
  );
};
