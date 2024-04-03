/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RequestHandler } from '@kbn/core/server';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { NODES_INFO_PRIVILEGES } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { wrapError, wrapEsError } from '../../utils/error_utils';

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

export const routeHandlerFactory: (
  license: RouteDependencies['license']
) => RequestHandler<undefined, undefined, undefined> = (license) => async (ctx, req, res) => {
  try {
    const esClient = (await ctx.core).elasticsearch.client;
    // If security is enabled, check that the user has at least permission to
    // view transforms before calling the _nodes endpoint with the internal user.
    if (license.getStatus().isSecurityEnabled === true) {
      const { has_all_requested: hasAllPrivileges } =
        await esClient.asCurrentUser.security.hasPrivileges({
          body: {
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
};
