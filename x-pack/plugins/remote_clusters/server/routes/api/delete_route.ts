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

import { RouteDependencies } from '../../types';
import { serializeCluster } from '../../../common/lib';
import { API_BASE_PATH } from '../../../common/constants';
import { doesClusterExist } from '../../lib/does_cluster_exist';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';

const paramsValidation = schema.object({
  nameOrNames: schema.string(),
});

type RouteParams = TypeOf<typeof paramsValidation>;

export const register = (deps: RouteDependencies): void => {
  const {
    router,
    lib: { handleEsError },
  } = deps;

  const deleteHandler: RequestHandler<RouteParams, unknown, unknown> = async (
    ctx,
    request,
    response
  ) => {
    try {
      const { client: clusterClient } = (await ctx.core).elasticsearch;

      const { nameOrNames } = request.params;
      const names = nameOrNames.split(',');

      const itemsDeleted: any[] = [];
      const errors: any[] = [];

      const clusterSettings = await clusterClient.asCurrentUser.cluster.getSettings();

      // Validator that returns an error if the remote cluster does not exist.
      const validateClusterDoesExist = async (name: string) => {
        try {
          const existingCluster = await doesClusterExist(clusterClient, name);
          if (!existingCluster) {
            return response.customError({
              statusCode: 404,
              body: {
                message: i18n.translate(
                  'xpack.remoteClusters.deleteRemoteCluster.noRemoteClusterErrorMessage',
                  {
                    defaultMessage: 'There is no remote cluster with that name.',
                  }
                ),
              },
            });
          }
        } catch (error) {
          return response.customError({ statusCode: 400, body: error });
        }
      };

      // Send the request to delete the cluster and return an error if it could not be deleted.
      const sendRequestToDeleteCluster = async (
        name: string,
        hasDeprecatedProxySetting: boolean
      ) => {
        try {
          const body = serializeCluster({ name, hasDeprecatedProxySetting });

          const updateClusterResponse = await clusterClient.asCurrentUser.cluster.putSettings({
            body,
          });
          const acknowledged = get(updateClusterResponse, 'acknowledged');
          const cluster = get(updateClusterResponse, `persistent.cluster.remote.${name}`);

          // Deletion was successful
          if (acknowledged && !cluster) {
            return null;
          }

          // If for some reason the ES response still returns the cluster information,
          // return an error. This shouldn't happen.
          return response.customError({
            statusCode: 400,
            body: {
              message: i18n.translate(
                'xpack.remoteClusters.deleteRemoteCluster.unknownRemoteClusterErrorMessage',
                {
                  defaultMessage: 'Unable to delete cluster, information still returned from ES.',
                }
              ),
            },
          });
        } catch (error) {
          return handleEsError({ error, response });
        }
      };

      const deleteCluster = async (clusterName: string) => {
        // Validate that the cluster exists.
        let error: any = await validateClusterDoesExist(clusterName);

        if (!error) {
          // Check if cluster contains deprecated proxy setting
          const hasDeprecatedProxySetting = Boolean(
            get(clusterSettings, `persistent.cluster.remote[${clusterName}].proxy`, undefined)
          );
          // Delete the cluster.
          error = await sendRequestToDeleteCluster(clusterName, hasDeprecatedProxySetting);
        }

        if (error) {
          errors.push({ name: clusterName, error });
        } else {
          itemsDeleted.push(clusterName);
        }
      };

      // Delete all our cluster in parallel.
      await Promise.all(names.map(deleteCluster));

      return response.ok({
        body: {
          itemsDeleted,
          errors,
        },
      });
    } catch (error) {
      return handleEsError({ error, response });
    }
  };

  router.delete(
    {
      path: `${API_BASE_PATH}/{nameOrNames}`,
      validate: {
        params: paramsValidation,
      },
    },
    licensePreRoutingFactory(deps, deleteHandler)
  );
};
