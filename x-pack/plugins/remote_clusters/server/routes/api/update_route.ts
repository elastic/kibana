/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { RequestHandler } from 'src/core/server';

import { API_BASE_PATH } from '../../../common/constants';
import { serializeCluster, deserializeCluster } from '../../../common/lib';
import { doesClusterExist } from '../../lib/does_cluster_exist';
import { RouteDependencies } from '../../types';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { isEsError } from '../../lib/is_es_error';
import { callWithRequestFactory } from '../../lib/call_with_request_factory';

export const register = (deps: RouteDependencies): void => {
  // TODO there are other settings that can be specified for a remote cluster via console/API that I think might cause issues when editing
  const updateHandler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    try {
      const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);

      const { name } = request.params;
      const { seeds, skipUnavailable } = request.body;

      // Check if cluster does exist.
      const existingCluster = await doesClusterExist(callWithRequest, name);
      if (!existingCluster) {
        return response.customError({
          statusCode: 404,
          body: {
            message: i18n.translate(
              'xpack.remoteClusters.updateRemoteCluster.noRemoteClusterErrorMessage',
              {
                defaultMessage: 'There is no remote cluster with that name.',
              }
            ),
          },
        });
      }

      // TODO is this still needed? Issue is closed
      // Delete existing cluster settings.
      // This is a workaround for: https://github.com/elastic/elasticsearch/issues/37799
      const deleteClusterPayload = serializeCluster({ name });
      await callWithRequest('cluster.putSettings', { body: deleteClusterPayload });

      // Update cluster as new settings
      const updateClusterPayload = serializeCluster({ name, seeds, skipUnavailable });
      const updateClusterResponse = await callWithRequest('cluster.putSettings', {
        body: updateClusterPayload,
      });

      const acknowledged = get(updateClusterResponse, 'acknowledged');
      const cluster = get(updateClusterResponse, `persistent.cluster.remote.${name}`);

      if (acknowledged && cluster) {
        const body = {
          ...deserializeCluster(name, cluster),
          isConfiguredByNode: false,
        };
        return response.ok({ body });
      }

      // If for some reason the ES response did not acknowledge,
      // return an error. This shouldn't happen.
      return response.customError({
        statusCode: 400,
        body: {
          message: i18n.translate(
            'xpack.remoteClusters.updateRemoteCluster.unknownRemoteClusterErrorMessage',
            {
              defaultMessage: 'Unable to edit cluster, no response returned from ES.',
            }
          ),
        },
      });
    } catch (error) {
      if (isEsError(error)) {
        return response.customError({ statusCode: error.statusCode, body: error });
      }
      return response.internalError({ body: error });
    }
  };

  deps.router.put(
    {
      path: `${API_BASE_PATH}/{name}`,
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        body: schema.object({
          seeds: schema.arrayOf(schema.string()),
          skipUnavailable: schema.boolean(),
        }),
      },
    },
    licensePreRoutingFactory(deps, updateHandler)
  );
};
