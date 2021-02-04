/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TagsPluginRouter } from '../../types';

export const registerDeleteTagRoute = (router: TagsPluginRouter) => {
  router.delete(
    {
      path: '/api/saved_objects_tagging/tags/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const { id } = req.params;
      await ctx.tags!.tagsClient.delete(id);
      return res.ok();
    })
  );
};
