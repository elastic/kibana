/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import { RequestHandler } from '@kbn/core/server';
import { deserializeCluster } from '../../../common/lib';
import { API_BASE_PATH } from '../../../common/constants';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { RouteDependencies } from '../../types';

export const register = (deps: RouteDependencies): void => {
  const {
    router,
    lib: { handleEsError },
  } = deps;

  const allHandler: RequestHandler<unknown, unknown, unknown> = async (ctx, request, response) => {
    try {
      const { client: clusterClient } = (await ctx.core).elasticsearch;
      const clusterSettings = await clusterClient.asCurrentUser.cluster.getSettings();

      const transientClusterNames = Object.keys(
        get(clusterSettings, 'transient.cluster.remote') || {}
      );
      const persistentClusterNames = Object.keys(
        get(clusterSettings, 'persistent.cluster.remote') || {}
      );

      const clustersByName = await clusterClient.asCurrentUser.cluster.remoteInfo();
      const clusterNames = (clustersByName && Object.keys(clustersByName)) || [];

      const body = await Promise.all(
        clusterNames.map(async (clusterName: string): Promise<any> => {
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

          // Resolve cluster status
          let clusterStatus;

          try {
            clusterStatus = await clusterClient.asCurrentUser.indices.resolveCluster({
              name: `${clusterName}:*`,
              filter_path: '*.connected',
            });
          } catch (error) {
            // If the cluster is not reachable, we'll get a TimeoutError.
            // In this case, we'll set the cluster status to disconnected.
            if (error.name === 'TimeoutError') {
              clusterStatus = { [clusterName]: { connected: false } };
            } else {
              throw error;
            }
          }

          return {
            ...deserializeCluster(
              clusterName,
              cluster,
              deprecatedProxyAddress,
              config.isCloudEnabled
            ),
            isConfiguredByNode,
            // We prioritize the cluster status from the resolve cluster API, and fallback to
            // the cluster connected status in case it's not present.
            isConnected: clusterStatus[clusterName]?.connected || cluster.connected,
          };
        })
      );

      return response.ok({ body });
    } catch (error) {
      return handleEsError({ error, response });
    }
  };

  router.get(
    {
      path: API_BASE_PATH,
      validate: false,
    },
    licensePreRoutingFactory(deps, allHandler)
  );
};
