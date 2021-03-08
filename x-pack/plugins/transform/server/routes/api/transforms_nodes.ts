/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../types';

import { addBasePath } from '../index';

import { wrapError, wrapEsError } from './error_utils';

export function registerTransformNodesRoutes({ router, license }: RouteDependencies) {
  /**
   * @apiGroup Transform Nodes
   *
   * @api {get} /api/transform/nodes Transform Nodes
   * @apiName GetTransformNodes
   * @apiDescription Get transform nodes
   */
  router.get<undefined, undefined, undefined>(
    {
      path: addBasePath('transforms/nodes'),
      validate: false,
    },
    license.guardApiRoute<undefined, undefined, undefined>(async (ctx, req, res) => {
      try {
        const { body } = await ctx.core.elasticsearch.client.asInternalUser.nodes.info({
          filter_path: 'nodes.*.attributes',
        });

        let count = 0;
        if (typeof body.nodes === 'object') {
          Object.keys(body.nodes).forEach((k) => {
            if (body.nodes[k].attributes !== undefined) {
              const transformNode = body.nodes[k].attributes['transform.node'];
              if (transformNode === 'true') {
                count++;
              }
            }
          });
        }

        return res.ok({ body: { count } });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );
}
