/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { tagsApiPrefix } from '../../common/constants';

export const registerUpdateTagRoute = (router: IRouter) => {
  router.post(
    {
      path: `${tagsApiPrefix}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          title: schema.string(),
          description: schema.string(),
          color: schema.string(),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const { id } = req.params;
      const tag = await ctx.tags!.tagsClient.update(id, req.body);
      return res.ok({
        body: {
          tag,
        },
      });
    })
  );
};
