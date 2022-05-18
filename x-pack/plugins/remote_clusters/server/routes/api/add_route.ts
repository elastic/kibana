/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { RequestHandler } from '@kbn/core/server';

import { serializeCluster, Cluster } from '../../../common/lib';
import { doesClusterExist } from '../../lib/does_cluster_exist';
import { API_BASE_PATH, PROXY_MODE, SNIFF_MODE } from '../../../common/constants';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { RouteDependencies } from '../../types';

const bodyValidation = schema.object({
  name: schema.string(),
  skipUnavailable: schema.boolean(),
  mode: schema.oneOf([schema.literal(PROXY_MODE), schema.literal(SNIFF_MODE)]),
  seeds: schema.nullable(schema.arrayOf(schema.string())),
  nodeConnections: schema.nullable(schema.number()),
  proxyAddress: schema.nullable(schema.string()),
  proxySocketConnections: schema.nullable(schema.number()),
  serverName: schema.nullable(schema.string()),
});

type RouteBody = TypeOf<typeof bodyValidation>;

export const register = (deps: RouteDependencies): void => {
  const {
    router,
    lib: { handleEsError },
  } = deps;

  const addHandler: RequestHandler<unknown, unknown, RouteBody> = async (
    ctx,
    request,
    response
  ) => {
    try {
      const { client: clusterClient } = (await ctx.core).elasticsearch;

      const { name } = request.body;

      // Check if cluster already exists.
      const existingCluster = await doesClusterExist(clusterClient, name);
      if (existingCluster) {
        return response.conflict({
          body: {
            message: i18n.translate(
              'xpack.remoteClusters.addRemoteCluster.existingRemoteClusterErrorMessage',
              {
                defaultMessage: 'There is already a remote cluster with that name.',
              }
            ),
          },
        });
      }

      const addClusterPayload = serializeCluster(request.body as Cluster);
      const updateClusterResponse = await clusterClient.asCurrentUser.cluster.putSettings({
        body: addClusterPayload,
      });
      const acknowledged = get(updateClusterResponse, 'acknowledged');
      const cluster = get(updateClusterResponse, `persistent.cluster.remote.${name}`);

      if (acknowledged && cluster) {
        return response.ok({
          body: {
            acknowledged: true,
          },
        });
      }

      // If for some reason the ES response did not acknowledge,
      // return an error. This shouldn't happen.
      return response.customError({
        statusCode: 400,
        body: {
          message: i18n.translate(
            'xpack.remoteClusters.addRemoteCluster.unknownRemoteClusterErrorMessage',
            {
              defaultMessage: 'Unable to add cluster, no response returned from ES.',
            }
          ),
        },
      });
    } catch (error) {
      return handleEsError({ error, response });
    }
  };
  router.post(
    {
      path: API_BASE_PATH,
      validate: {
        body: bodyValidation,
      },
    },
    licensePreRoutingFactory(deps, addHandler)
  );
};
