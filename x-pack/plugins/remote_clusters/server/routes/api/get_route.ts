/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import { RequestHandler } from 'src/core/server';
import { deserializeCluster } from '../../../common/lib';
import { API_BASE_PATH } from '../../../common/constants';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { isEsError } from '../../lib/is_es_error';
import { RouteDependencies } from '../../types';

export const register = (deps: RouteDependencies): void => {
  const allHandler: RequestHandler<unknown, unknown, unknown> = async (ctx, request, response) => {
    try {
      const callAsCurrentUser = await ctx.core.elasticsearch.dataClient.callAsCurrentUser;
      const clusterSettings = await callAsCurrentUser('cluster.getSettings');

      const transientClusterNames = Object.keys(
        get(clusterSettings, 'transient.cluster.remote') || {}
      );
      const persistentClusterNames = Object.keys(
        get(clusterSettings, 'persistent.cluster.remote') || {}
      );

      const clustersByName = await callAsCurrentUser('cluster.remoteInfo');
      const clusterNames = (clustersByName && Object.keys(clustersByName)) || [];

      const body = clusterNames.map((clusterName: string): any => {
        const cluster = clustersByName[clusterName];
        const isTransient = transientClusterNames.includes(clusterName);
        const isPersistent = persistentClusterNames.includes(clusterName);
        // If the cluster hasn't been stored in the cluster state, then it's defined by the
        // node's config file.
        const isConfiguredByNode = !isTransient && !isPersistent;

        return {
          ...deserializeCluster(clusterName, cluster),
          isConfiguredByNode,
        };
      });

      return response.ok({ body });
    } catch (error) {
      if (isEsError(error)) {
        return response.customError({ statusCode: error.statusCode, body: error });
      }
      return response.internalError({ body: error });
    }
  };

  deps.router.get(
    {
      path: API_BASE_PATH,
      validate: false,
    },
    licensePreRoutingFactory(deps, allHandler)
  );
};
