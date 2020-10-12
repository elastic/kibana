/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListNodesRouteResponse, NodeDataRole } from '../../../../common/types';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

interface Stats {
  nodes: {
    [nodeId: string]: {
      attributes: Record<string, string>;
      roles: string[];
    };
  };
}

function convertStatsIntoList(
  stats: Stats,
  disallowedNodeAttributes: string[]
): ListNodesRouteResponse {
  return Object.entries(stats.nodes).reduce(
    (accum, [nodeId, nodeStats]) => {
      const attributes = nodeStats.attributes || {};
      for (const [key, value] of Object.entries(attributes)) {
        const isNodeAttributeAllowed = !disallowedNodeAttributes.includes(key);
        if (isNodeAttributeAllowed) {
          const attributeString = `${key}:${value}`;
          accum.nodesByAttributes[attributeString] = accum.nodesByAttributes[attributeString] ?? [];
          accum.nodesByAttributes[attributeString].push(nodeId);
        }
      }

      const dataRoles = nodeStats.roles.filter((r) => r.startsWith('data')) as NodeDataRole[];
      for (const role of dataRoles) {
        accum.nodesByRoles[role as NodeDataRole] = accum.nodesByRoles[role] ?? [];
        accum.nodesByRoles[role as NodeDataRole]!.push(nodeId);
      }
      return accum;
    },
    { nodesByAttributes: {}, nodesByRoles: {} } as ListNodesRouteResponse
  );
}

export function registerListRoute({ router, config, license }: RouteDependencies) {
  const { filteredNodeAttributes } = config;

  const NODE_ATTRS_KEYS_TO_IGNORE: string[] = [
    'ml.enabled',
    'ml.machine_memory',
    'ml.max_open_jobs',
    // Used by ML to identify nodes that have transform enabled:
    // https://github.com/elastic/elasticsearch/pull/52712/files#diff-225cc2c1291b4c60a8c3412a619094e1R147
    'transform.node',
    'xpack.installed',
  ];

  const disallowedNodeAttributes = [...NODE_ATTRS_KEYS_TO_IGNORE, ...filteredNodeAttributes];

  router.get(
    { path: addBasePath('/nodes/list'), validate: false },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const statsResponse = await context.core.elasticsearch.client.asCurrentUser.nodes.stats<
          Stats
        >();
        const body: ListNodesRouteResponse = convertStatsIntoList(
          statsResponse.body,
          disallowedNodeAttributes
        );
        return response.ok({ body });
      } catch (e) {
        if (e.name === 'ResponseError') {
          return response.customError({
            statusCode: e.statusCode,
            body: { message: e.body.error?.reason },
          });
        }
        // Case: default
        return response.internalError({ body: e });
      }
    })
  );
}
