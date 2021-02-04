/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import { RequestHandler } from 'src/core/server';
import { deserializeCluster } from '../../../common/lib';
import { API_BASE_PATH } from '../../../common/constants';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { isEsError } from '../../shared_imports';
import { RouteDependencies } from '../../types';

export const register = (deps: RouteDependencies): void => {
  const allHandler: RequestHandler<unknown, unknown, unknown> = async (ctx, request, response) => {
    try {
      const callAsCurrentUser = await ctx.core.elasticsearch.legacy.client.callAsCurrentUser;
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
        const { config } = deps;

        // If the cluster hasn't been stored in the cluster state, then it's defined by the
        // node's config file.
        const isConfiguredByNode = !isTransient && !isPersistent;

        // Pre-7.6, ES supported an undocumented "proxy" field
        // ES does not handle migrating this to the new implementation, so we need to surface it in the UI
        // This value is not available via the GET /_remote/info API, so we get it from the cluster settings
        const deprecatedProxyAddress = isPersistent
          ? get(clusterSettings, `persistent.cluster.remote[${clusterName}].proxy`, undefined)
          : undefined;

        return {
          ...deserializeCluster(
            clusterName,
            cluster,
            deprecatedProxyAddress,
            config.isCloudEnabled
          ),
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
