/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { API_BASE_PATH } from '../../common/constants';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';

interface NodeWithLowDiskSpace {
  nodeId: string;
  used: string;
  lowDiskWatermarkSetting: string;
}

// The percentage used to determine if the user has low disk space
// For example, if a user has used 80%, and has a low disk watermark setting of 85%, we would warn the user
const LOW_DISK_SPACE_BUFFER_PERCENTAGE = 5;

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
            defaults && defaults['cluster.routing.allocation.disk.watermark.low'];
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

          if (lowDiskWatermarkSetting) {
            const { body: nodeStats } = await client.asCurrentUser.nodes.stats({
              metric: 'fs',
            });

            const nodeIds = Object.keys(nodeStats.nodes);

            const nodesWithLowDiskSpace: NodeWithLowDiskSpace[] = [];

            nodeIds.forEach((nodeId) => {
              const node = nodeStats.nodes[nodeId];
              const byteStats = node.fs.total;
              const { total_in_bytes: totalInBytes, available_in_bytes: availableInBytes } =
                byteStats;

              // The low disk watermark setting can be configured as a percentage or bytes value
              const isLowDiskWatermarkPercentage = /^(\d+|(\.\d+))(\.\d+)?%$/.test(
                lowDiskWatermarkSetting!
              );

              if (isLowDiskWatermarkPercentage) {
                const percentageAvailable = Math.round(availableInBytes / totalInBytes) * 100;
                const percentageUsed = 100 - percentageAvailable;
                const rawLowDiskWatermarkPercentageValue = Number(
                  lowDiskWatermarkSetting!.replace('%', '')
                );

                // Substract LOW_DISK_SPACE_BUFFER_PERCENTAGE (5%) from the low disk watermark setting
                // If the percentage in use is >= to this, mark node as having low disk space
                if (
                  percentageUsed >=
                  rawLowDiskWatermarkPercentageValue - LOW_DISK_SPACE_BUFFER_PERCENTAGE
                ) {
                  nodesWithLowDiskSpace.push({
                    nodeId,
                    used: `${percentageUsed}%`,
                    lowDiskWatermarkSetting: lowDiskWatermarkSetting!,
                  });
                }
              } else {
                // If not a percentage value, assume user configured low disk watermark setting in bytes
                const rawLowDiskWatermarkBytesValue = ByteSizeValue.parse(
                  lowDiskWatermarkSetting!
                ).getValueInBytes();

                const percentageAvailable = Math.round(availableInBytes / totalInBytes) * 100;
                const percentageUsed = 100 - percentageAvailable;
                const rawLowDiskWatermarkPercentageValue =
                  Math.round(rawLowDiskWatermarkBytesValue / totalInBytes) * 100;

                // Substract LOW_DISK_SPACE_BUFFER_PERCENTAGE (5%) from the low disk watermark setting
                // If the percentage in use is >= to this, mark node as having low disk space
                if (
                  percentageUsed >=
                  rawLowDiskWatermarkPercentageValue - LOW_DISK_SPACE_BUFFER_PERCENTAGE
                ) {
                  nodesWithLowDiskSpace.push({
                    nodeId,
                    used: `${percentageUsed}%`,
                    lowDiskWatermarkSetting: lowDiskWatermarkSetting!,
                  });
                }
              }
            });

            return response.ok({ body: nodesWithLowDiskSpace });
          }

          // If the low disk watermark setting is undefined, send empty array
          // This may occur if configured in elasticsearch.yml
          return response.ok({ body: [] });
        } catch (error) {
          return handleEsError({ error, response });
        }
      }
    )
  );
}
