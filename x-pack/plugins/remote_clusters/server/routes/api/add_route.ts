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
} from '../../../../../server/lib/create_router';
import { doesClusterExist } from '../../lib/does_cluster_exist';
import { serializeCluster } from '../../lib/cluster_serialization';

export const register = (router: Router): void => {
  router.post('', addHandler);
};

export const addHandler: RouterRouteHandler = async (req, callWithRequest): Promise<any> => {
  const { name, seeds, skipUnavailable } = req.payload as any;

  // Check if cluster already exists.
  const existingCluster = await doesClusterExist(callWithRequest, name);
  if (existingCluster) {
    const conflictError = wrapCustomError(
      new Error('There is already a remote cluster with that name.'),
      409
    );

    throw conflictError;
  }

  const addClusterPayload = serializeCluster({ name, seeds, skipUnavailable });
  const response = await callWithRequest('cluster.putSettings', { body: addClusterPayload });
  const acknowledged = get(response, 'acknowledged');
  const cluster = get(response, `persistent.cluster.remote.${name}`);

  if (acknowledged && cluster) {
    return {
      acknowledged: true,
    };
  }

  // If for some reason the ES response did not acknowledge,
  // return an error. This shouldn't happen.
  throw wrapCustomError(new Error('Unable to add cluster, no response returned from ES.'), 400);
};
