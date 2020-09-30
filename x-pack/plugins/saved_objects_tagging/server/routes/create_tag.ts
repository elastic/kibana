/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { tagsApiPrefix } from '../../common/constants';

export const registerCreateTagRoute = (router: IRouter) => {
  router.post(
    {
      path: `${tagsApiPrefix}/create`,
      validate: {
        body: schema.object({
          title: schema.string(),
          description: schema.string(),
          color: schema.string(),
        }),
      },
    },
    async (ctx, req, res) => {
      const tag = await ctx.tags!.tagsClient.create(req.body);
      return res.ok({
        body: {
          tag,
        },
      });
    }
  );
};
