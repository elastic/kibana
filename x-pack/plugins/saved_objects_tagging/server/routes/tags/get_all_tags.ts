/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { TagsPluginRouter } from '../../types';

export const registerGetAllTagsRoute = (router: TagsPluginRouter) => {
  router.get(
    {
      path: '/api/saved_objects_tagging/tags',
      validate: {},
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const tags = await ctx.tags!.tagsClient.getAll();
      return res.ok({
        body: {
          tags,
        },
      });
    })
  );
};
