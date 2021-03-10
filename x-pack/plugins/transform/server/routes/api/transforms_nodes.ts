/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '../../../common/utils/object_utils';

import { RouteDependencies } from '../../types';

import { addBasePath } from '../index';

import { wrapError, wrapEsError } from './error_utils';

export function registerTransformNodesRoutes({ router, license }: RouteDependencies) {
  /**
   * @apiGroup Transform Nodes
   *
   * @api {get} /api/transforms/_nodes Transform Nodes
   * @apiName GetTransformNodes
   * @apiDescription Get transform nodes
   */
  router.get<undefined, undefined, undefined>(
    {
      path: addBasePath('transforms/_nodes'),
      validate: false,
    },
    license.guardApiRoute<undefined, undefined, undefined>(async (ctx, req, res) => {
      try {
        const { body } = await ctx.core.elasticsearch.client.asInternalUser.nodes.info({
          filter_path: 'nodes.*.attributes',
        });

        let count = 0;
        if (isPopulatedObject(body.nodes)) {
          for (const { attributes } of Object.values(body.nodes)) {
            if (attributes['transform.node'] === 'true') {
              count++;
            }
          }
        }

        return res.ok({ body: { count } });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );
}
