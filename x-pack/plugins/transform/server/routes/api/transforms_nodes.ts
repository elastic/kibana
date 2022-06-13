/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { NODES_INFO_PRIVILEGES } from '../../../common/constants';
import { isPopulatedObject } from '../../../common/shared_imports';

import { RouteDependencies } from '../../types';

import { addBasePath } from '..';

import { wrapError, wrapEsError } from './error_utils';

const NODE_ROLES = 'roles';

interface NodesAttributes {
  roles: string[];
}

type Nodes = Record<string, NodesAttributes>;

export const isNodes = (arg: unknown): arg is Nodes => {
  return (
    isPopulatedObject(arg) &&
    Object.values(arg).every(
      (node) => isPopulatedObject(node, [NODE_ROLES]) && Array.isArray(node.roles)
    )
  );
};

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
        const esClient = (await ctx.core).elasticsearch.client;
        // If security is enabled, check that the user has at least permission to
        // view transforms before calling the _nodes endpoint with the internal user.
        if (license.getStatus().isSecurityEnabled === true) {
          const { has_all_requested: hasAllPrivileges } =
            await esClient.asCurrentUser.security.hasPrivileges({
              body: {
                // @ts-expect-error SecurityClusterPrivilege doesn’t contain all the priviledges
                cluster: NODES_INFO_PRIVILEGES,
              },
            });

          if (!hasAllPrivileges) {
            return res.customError(wrapError(new Boom.Boom('Forbidden', { statusCode: 403 })));
          }
        }

        const { nodes } = await esClient.asInternalUser.nodes.info({
          filter_path: `nodes.*.${NODE_ROLES}`,
        });

        let count = 0;
        if (isNodes(nodes)) {
          for (const { roles } of Object.values(nodes)) {
            if (roles.includes('transform')) {
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
