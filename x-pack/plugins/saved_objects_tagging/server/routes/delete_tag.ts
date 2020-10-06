/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { tagsApiPrefix } from '../../common/constants';

export const registerDeleteTagRoute = (router: IRouter) => {
  router.delete(
    {
      path: `${tagsApiPrefix}/{id}`,
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
