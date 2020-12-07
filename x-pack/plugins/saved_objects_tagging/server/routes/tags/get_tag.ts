/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';

export const registerGetTagRoute = (router: IRouter) => {
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
      const tag = await ctx.tags!.tagsClient.get(id);
      return res.ok({
        body: {
          tag,
        },
      });
    })
  );
};
