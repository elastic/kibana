/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'kibana/server';
import { ElasticsearchAssetType, EsAssetReference } from '../../../../types';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common/constants';
import { appContextService } from '../../../app_context';

export const stopTransforms = async (transformIds: string[], esClient: ElasticsearchClient) => {
  for (const transformId of transformIds) {
    await esClient.transport.request(
      {
        method: 'POST',
        path: `/_transform/${transformId}/_stop`,
        querystring: 'force=true',
      },
      {
        ignore: [404],
      }
    );
  }
};

export const deleteTransforms = async (esClient: ElasticsearchClient, transformIds: string[]) => {
  const logger = appContextService.getLogger();
  if (transformIds.length) {
    logger.info(`Deleting currently installed transform ids ${transformIds}`);
  }
  await Promise.all(
    transformIds.map(async (transformId) => {
      // get the index the transform
      const { body } = await esClient.transport.request(
        {
          method: 'GET',
          path: `/_transform/${transformId}`,
        },
        {
          ignore: [404],
        }
      );

      // `transport.request` doesn't accept generics, so we cast the type here.
      const transformResponse = body as {
        count: number;
        transforms?: Array<{
          dest: {
            index: string;
          };
        }>;
      };

      await stopTransforms([transformId], esClient);
      await esClient.transport.request(
        {
          method: 'DELETE',
          querystring: 'force=true',
          path: `/_transform/${transformId}`,
        },
        {
          ignore: [404],
        }
      );
      logger.info(`Deleted: ${transformId}`);
      if (transformResponse?.transforms) {
        // expect this to be 1
        for (const transform of transformResponse.transforms) {
          await esClient.transport.request(
            {
              method: 'DELETE',
              path: `/${transform?.dest?.index}`,
            },
            {
              ignore: [404],
            }
          );
        }
      } else {
        logger.warn(`cannot find transform for ${transformId}`);
      }
    })
  );
};

export const deleteTransformRefs = async (
  savedObjectsClient: SavedObjectsClientContract,
  installedEsAssets: EsAssetReference[],
  pkgName: string,
  installedEsIdToRemove: string[],
  currentInstalledEsTransformIds: string[]
) => {
  const seen = new Set<string>();
  const filteredAssets = installedEsAssets.filter(({ type, id }) => {
    if (type !== ElasticsearchAssetType.transform) return true;
    const add =
      (currentInstalledEsTransformIds.includes(id) || !installedEsIdToRemove.includes(id)) &&
      !seen.has(id);
    seen.add(id);
    return add;
  });
  return savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_es: filteredAssets,
  });
};
