/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '../../common/constants';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';

export function registerDiskSpaceRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    {
      path: `${API_BASE_PATH}/disk_space`,
      validate: false,
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            elasticsearch: { client },
          },
        },
        request,
        response
      ) => {
        try {
          const { body: clusterSettings } = await client.asCurrentUser.cluster.getSettings({
            flat_settings: true,
            include_defaults: true,
          });

          const { defaults, persistent, transient } = clusterSettings;

          const defaultLowDiskWatermarkSetting =
            defaults['cluster.routing.allocation.disk.watermark.low'];
          const transientLowDiskWatermarkSetting =
            transient['cluster.routing.allocation.disk.watermark.low'];
          const persistentLowDiskWatermarkSetting =
            persistent['cluster.routing.allocation.disk.watermark.low'];

          let lowDiskWatermarkSetting: string | undefined;

          // Settings are applied in the following order of precendence: transient, persistent, default
          if (transientLowDiskWatermarkSetting) {
            lowDiskWatermarkSetting = transientLowDiskWatermarkSetting;
          } else if (persistentLowDiskWatermarkSetting) {
            lowDiskWatermarkSetting = persistentLowDiskWatermarkSetting;
          } else if (defaultLowDiskWatermarkSetting) {
            lowDiskWatermarkSetting = defaultLowDiskWatermarkSetting;
          }

          // This may be undefined if configured in elasticsearch.yml
          // if (lowDiskWatermarkSetting) {
          //   const { body: nodeStats } = await client.asCurrentUser.nodes.stats({
          //     metric: 'fs',
          //   });

          //   const nodeIds = Object.keys(nodeStats.nodes);

          // TODO finish implementing
          //   nodeIds.forEach((nodeId) => {
          //     const node = nodeStats.nodes[nodeId];
          //     const byteStats = node.fs.total;
          //     const { total_in_bytes: totalInBytes, available_in_bytes: availableInBytes } =
          //       byteStats;
          //   });

          //   return response.ok({ body: {} });
          // }

          // TODO temp
          return response.ok({ body: {} });
        } catch (error) {
          return handleEsError({ error, response });
        }
      }
    )
  );
}
