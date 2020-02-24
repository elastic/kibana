/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { isEsError } from '../../lib/is_es_error';

const paramsValidation = schema.object({
  nameOrNames: schema.string(),
});

type RouteParams = TypeOf<typeof paramsValidation>;

export const register = (deps: RouteDependencies): void => {
  const deleteHandler: RequestHandler<RouteParams, unknown, unknown> = async (
    ctx,
    request,
    response
  ) => {
    try {
      const callAsCurrentUser = ctx.core.elasticsearch.dataClient.callAsCurrentUser;

      const { nameOrNames } = request.params;
      const names = nameOrNames.split(',');

      const itemsDeleted: any[] = [];
      const errors: any[] = [];

      // Validator that returns an error if the remote cluster does not exist.
      const validateClusterDoesExist = async (name: string) => {
        try {
          const existingCluster = await doesClusterExist(callAsCurrentUser, name);
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
      const sendRequestToDeleteCluster = async (name: string) => {
        try {
          const body = serializeCluster({ name });
          const updateClusterResponse = await callAsCurrentUser('cluster.putSettings', { body });
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
          if (isEsError(error)) {
            return response.customError({ statusCode: error.statusCode, body: error });
          }
          return response.internalError({ body: error });
        }
      };

      const deleteCluster = async (clusterName: string) => {
        // Validate that the cluster exists.
        let error: any = await validateClusterDoesExist(clusterName);

        if (!error) {
          // Delete the cluster.
          error = await sendRequestToDeleteCluster(clusterName);
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
      if (isEsError(error)) {
        return response.customError({ statusCode: error.statusCode, body: error });
      }
      return response.internalError({ body: error });
    }
  };

  deps.router.delete(
    {
      path: `${API_BASE_PATH}/{nameOrNames}`,
      validate: {
        params: paramsValidation,
      },
    },
    licensePreRoutingFactory(deps, deleteHandler)
  );
};
