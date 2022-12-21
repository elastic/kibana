/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TagsPluginRouter } from '../../types';

export const registerGetTagRoute = (router: TagsPluginRouter) => {
  router.get(
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
      const { tagsClient } = await ctx.tags;
      const tag = await tagsClient.get(id);
      return res.ok({
        body: {
          tag,
        },
      });
    })
  );
};
