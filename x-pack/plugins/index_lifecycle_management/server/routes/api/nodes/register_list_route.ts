/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ListNodesRouteResponse, DataTierRole } from '../../../../common/types';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

interface Settings {
  nodes: {
    [nodeId: string]: {
      attributes: Record<string, string>;
      roles: string[];
      settings: {
        node: {
          data?: string;
        };
      };
    };
  };
}

export function convertSettingsIntoLists(
  settings: Settings,
  disallowedNodeAttributes: string[]
): ListNodesRouteResponse {
  return Object.entries(settings.nodes).reduce(
    (accum, [nodeId, nodeSettings]) => {
      const attributes = nodeSettings.attributes || {};
      for (const [key, value] of Object.entries(attributes)) {
        const isNodeAttributeAllowed = !disallowedNodeAttributes.includes(key);
        if (isNodeAttributeAllowed) {
          const attributeString = `${key}:${value}`;
          accum.nodesByAttributes[attributeString] = accum.nodesByAttributes[attributeString] ?? [];
          accum.nodesByAttributes[attributeString].push(nodeId);
        }
      }

      const dataRoles = nodeSettings.roles.filter((r) => r.startsWith('data')) as DataTierRole[];
      for (const role of dataRoles) {
        accum.nodesByRoles[role as DataTierRole] = accum.nodesByRoles[role] ?? [];
        accum.nodesByRoles[role as DataTierRole]!.push(nodeId);
      }

      // If we detect a single node using legacy "data:true" setting we know we are not using data roles for
      // data allocation.
      if (nodeSettings.settings?.node?.data === 'true') {
        accum.isUsingDeprecatedDataRoleConfig = true;
      }

      return accum;
    },
    {
      nodesByAttributes: {},
      nodesByRoles: {},
      // Start with assumption that we are not using deprecated config
      isUsingDeprecatedDataRoleConfig: false,
    } as ListNodesRouteResponse
  );
}

export function registerListRoute({
  router,
  config,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  const { filteredNodeAttributes } = config;

  const NODE_ATTRS_KEYS_TO_IGNORE: string[] = [
    'ml.enabled',
    'ml.machine_memory',
    'ml.max_open_jobs',
    'ml.max_jvm_size',
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
        const esClient = (await context.core).elasticsearch.client;
        const settingsResponse = await esClient.asCurrentUser.transport.request({
          method: 'GET',
          path: '/_nodes/settings',
          querystring: {
            format: 'json',
          },
        });
        const body: ListNodesRouteResponse = convertSettingsIntoLists(
          settingsResponse as Settings,
          disallowedNodeAttributes
        );
        return response.ok({ body });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
