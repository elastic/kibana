/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { RequestHandler } from 'src/core/server';

import { API_BASE_PATH, SNIFF_MODE, PROXY_MODE } from '../../../common/constants';
import { serializeCluster, deserializeCluster, Cluster, ClusterInfoEs } from '../../../common/lib';
import { doesClusterExist } from '../../lib/does_cluster_exist';
import { RouteDependencies } from '../../types';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';

const bodyValidation = schema.object({
  skipUnavailable: schema.boolean(),
  mode: schema.oneOf([schema.literal(PROXY_MODE), schema.literal(SNIFF_MODE)]),
  seeds: schema.nullable(schema.arrayOf(schema.string())),
  nodeConnections: schema.nullable(schema.number()),
  proxyAddress: schema.nullable(schema.string()),
  proxySocketConnections: schema.nullable(schema.number()),
  serverName: schema.nullable(schema.string()),
  hasDeprecatedProxySetting: schema.maybe(schema.boolean()),
});

const paramsValidation = schema.object({
  name: schema.string(),
});

type RouteParams = TypeOf<typeof paramsValidation>;

type RouteBody = TypeOf<typeof bodyValidation>;

export const register = (deps: RouteDependencies): void => {
  const {
    router,
    lib: { handleEsError },
  } = deps;

  const updateHandler: RequestHandler<RouteParams, unknown, RouteBody> = async (
    ctx,
    request,
    response
  ) => {
    try {
      const { client: clusterClient } = (await ctx.core).elasticsearch;

      const { name } = request.params;

      // Check if cluster does exist.
      const existingCluster = await doesClusterExist(clusterClient, name);
      if (!existingCluster) {
        return response.notFound({
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

      // Update cluster as new settings
      const updateClusterPayload = serializeCluster({ ...request.body, name } as Cluster);

      const updateClusterResponse = await clusterClient.asCurrentUser.cluster.putSettings({
        body: updateClusterPayload,
      });

      const acknowledged = get(updateClusterResponse, 'acknowledged');
      const cluster = get(
        updateClusterResponse,
        `persistent.cluster.remote.${name}`
      ) as ClusterInfoEs;

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
      return handleEsError({ error, response });
    }
  };

  router.put(
    {
      path: `${API_BASE_PATH}/{name}`,
      validate: {
        params: paramsValidation,
        body: bodyValidation,
      },
    },
    licensePreRoutingFactory(deps, updateHandler)
  );
};
