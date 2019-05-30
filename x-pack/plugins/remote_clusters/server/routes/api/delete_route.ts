/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import {
  Router,
  RouterRouteHandler,
  wrapCustomError,
  wrapEsError,
  wrapUnknownError,
} from '../../../../../server/lib/create_router';
import { doesClusterExist } from '../../lib/does_cluster_exist';
import { serializeCluster } from '../../lib/cluster_serialization';

export const register = (router: Router, isEsError: any): void => {
  router.delete('/{nameOrNames}', createDeleteHandler(isEsError));
};

export const createDeleteHandler: any = (isEsError: any) => {
  const deleteHandler: RouterRouteHandler = async (
    req,
    callWithRequest
  ): Promise<{
    itemsDeleted: any[];
    errors: any[];
  }> => {
    const { nameOrNames } = req.params as any;
    const names = nameOrNames.split(',');

    const itemsDeleted: any[] = [];
    const errors: any[] = [];

    // Validator that returns an error if the remote cluster does not exist.
    const validateClusterDoesExist = async (name: string) => {
      try {
        const existingCluster = await doesClusterExist(callWithRequest, name);
        if (!existingCluster) {
          return wrapCustomError(new Error('There is no remote cluster with that name.'), 404);
        }
      } catch (error) {
        return wrapCustomError(error, 400);
      }
    };

    // Send the request to delete the cluster and return an error if it could not be deleted.
    const sendRequestToDeleteCluster = async (name: string) => {
      try {
        const body = serializeCluster({ name });
        const response = await callWithRequest('cluster.putSettings', { body });
        const acknowledged = get(response, 'acknowledged');
        const cluster = get(response, `persistent.cluster.remote.${name}`);

        if (acknowledged && !cluster) {
          return null;
        }

        // If for some reason the ES response still returns the cluster information,
        // return an error. This shouldn't happen.
        return wrapCustomError(
          new Error('Unable to delete cluster, information still returned from ES.'),
          400
        );
      } catch (error) {
        if (isEsError(error)) {
          return wrapEsError(error);
        }

        return wrapUnknownError(error);
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

    return {
      itemsDeleted,
      errors,
    };
  };

  return deleteHandler;
};
