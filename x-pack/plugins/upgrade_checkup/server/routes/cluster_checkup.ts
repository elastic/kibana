/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from 'hapi';
import Joi from 'joi';

type DEPRECATION_LEVEL = 'none' | 'info' | 'warning' | 'critical';
type INDEX_ACTION = 'upgrade' | 'reindex';

interface DeprecationInfo {
  level: DEPRECATION_LEVEL;
  message: string;
  url: string;
  details?: string;
}

interface DeprecationAPIResponse {
  cluster_settings: DeprecationInfo[];
  node_settings: {
    [nodeName: string]: DeprecationInfo[];
  };
  index_settings: {
    [indexName: string]: DeprecationInfo[];
  };
}

interface AssistanceAPIResponse {
  indices: {
    [indexName: string]: {
      action_required: INDEX_ACTION;
    };
  };
}

interface IndexInfo {
  deprecations?: DeprecationInfo[];
  actionRequired?: INDEX_ACTION;
}

interface IndexInfoMap {
  [indexName: string]: IndexInfo;
}

export function registerClusterCheckupRoutes(server: Server) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');

  server.route({
    path: '/api/upgrade_checkup/status',
    method: 'GET',
    async handler(request) {
      try {
        const migrationAssistance = (await callWithRequest(request, 'transport.request', {
          path: '/_xpack/migration/assistance',
          method: 'GET',
        })) as AssistanceAPIResponse;

        const deprecations = (await callWithRequest(request, 'transport.request', {
          path: '/_xpack/migration/deprecations',
          method: 'GET',
        })) as DeprecationAPIResponse;

        const indexNames = new Set(
          Object.keys(deprecations.index_settings).concat(Object.keys(migrationAssistance.indices))
        );

        const combinedIndexInfo: IndexInfoMap = {};
        for (const indexName of indexNames) {
          const actionRequired = migrationAssistance.indices[indexName]
            ? migrationAssistance.indices[indexName].action_required
            : undefined;

          combinedIndexInfo[indexName] = {
            deprecations: deprecations.index_settings[indexName],
            actionRequired,
          };
        }

        return {
          cluster: {
            deprecations: deprecations.cluster_settings,
          },
          nodes: {
            deprecations: deprecations.node_settings,
          },
          indices: combinedIndexInfo,
        };
      } catch (e) {
        if (e.status === 403) {
          return Boom.forbidden(e.message);
        }

        return Boom.boomify(e, {
          statusCode: 500,
        });
      }
    },
  });

  server.route({
    path: '/api/upgrade_checkup/index_upgrade/{indexName}',
    method: 'POST',
    options: {
      validate: {
        params: {
          // TODO: make this more specific
          indexName: Joi.string().required(),
        },
      },
    },
    async handler(request) {
      try {
        const index = request.params.indexName;
        const response = await callWithRequest(request, 'transport.request', {
          path: `/_xpack/migration/upgrade/${index}`,
          method: 'POST',
          query: {
            wait_for_completion: false,
          },
        });

        return response;
      } catch (e) {
        return Boom.boomify(e);
      }
    },
  });
}
