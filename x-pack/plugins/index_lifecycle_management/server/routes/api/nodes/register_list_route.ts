/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'src/core/server';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

function convertStatsIntoList(stats: any, disallowedNodeAttributes: string[]): any {
  return Object.entries(stats.nodes).reduce((accum: any, [nodeId, nodeStats]: [any, any]) => {
    const attributes = nodeStats.attributes || {};
    for (const [key, value] of Object.entries(attributes)) {
      const isNodeAttributeAllowed = !disallowedNodeAttributes.includes(key);
      if (isNodeAttributeAllowed) {
        const attributeString = `${key}:${value}`;
        accum[attributeString] = accum[attributeString] || [];
        accum[attributeString].push(nodeId);
      }
    }
    return accum;
  }, {});
}

async function fetchNodeStats(callAsCurrentUser: LegacyAPICaller): Promise<any> {
  const params = {
    format: 'json',
  };

  return await callAsCurrentUser('nodes.stats', params);
}

export function registerListRoute({ router, config, license, lib }: RouteDependencies) {
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
        const stats = await fetchNodeStats(
          context.core.elasticsearch.legacy.client.callAsCurrentUser
        );
        const okResponse = { body: convertStatsIntoList(stats, disallowedNodeAttributes) };
        return response.ok(okResponse);
      } catch (e) {
        if (lib.isEsError(e)) {
          return response.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return response.internalError({ body: e });
      }
    })
  );
}
