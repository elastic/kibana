/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { updateEsAssetReferences } from '../../packages/install';

import type { EsAssetReference, Installation } from '../../../../../common';
import { ElasticsearchAssetType, PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common';

import { retryTransientEsErrors } from '../retry';

import type { SecondaryAuthorizationHeader } from './common';

async function reauthorizeAndStartTransform({
  esClient,
  logger,
  transformId,
  secondaryAuth,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  transformId: string;
  secondaryAuth?: SecondaryAuthorizationHeader;
  shouldInstallSequentially?: boolean;
}) {
  try {
    await retryTransientEsErrors(
      () =>
        esClient.transform.updateTransform(
          { transform_id: transformId },
          { ...(secondaryAuth ? secondaryAuth : {}) }
        ),
      { logger, additionalResponseStatuses: [400] }
    );
    logger.debug(`Updated transform: ${transformId}`);
    // return { transformId, success: true, error: null };
  } catch (err) {
    return { transformId, success: false, error: err };
  }

  try {
    await retryTransientEsErrors(
      () =>
        esClient.transform.startTransform(
          { transform_id: transformId },
          // Ignore error if transform has already been started
          { ...(secondaryAuth ? secondaryAuth : {}), ignore: [409] }
        ),
      { logger, additionalResponseStatuses: [400] }
    );
    logger.debug(`Started transform: ${transformId}`);
    return { transformId, success: true, error: null };
  } catch (err) {
    return { transformId, success: false, error: err };
  }
}
export async function handleTransformReauthorizeAndStart({
  esClient,
  savedObjectsClient,
  logger,
  pkgName,
  pkgVersion,
  transforms,
  secondaryAuth,
  shouldInstallSequentially = true,
}: {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  pkgName: string;
  pkgVersion: string;
  transforms: Array<{ transformId: string }>;
  secondaryAuth?: SecondaryAuthorizationHeader;
  shouldInstallSequentially?: boolean;
}): Promise<EsAssetReference[]> {
  if (!secondaryAuth) {
    throw Error(
      'A valid secondary authorization with sufficient `manage_transform` permission is needed to re-authorize and start transforms.'
    );
  }
  let authorizedTransforms = [];
  // @TODO:  implement this in UI
  if (shouldInstallSequentially) {
    for (const transform of transforms) {
      const authorizedTransform = await reauthorizeAndStartTransform({
        esClient,
        logger,
        transformId: transform.transformId,
        secondaryAuth,
      });
      authorizedTransforms.push(authorizedTransform);
    }
  } else {
    // Else, create & start all the transforms at once for speed
    const transformsPromises = transforms.map(async (transform) => {
      return await reauthorizeAndStartTransform({
        esClient,
        logger,
        transformId: transform.transformId,
        secondaryAuth,
      });
    });

    authorizedTransforms = await Promise.all(transformsPromises).then((results) => results.flat());
  }

  const so = await savedObjectsClient.get<Installation>(PACKAGES_SAVED_OBJECT_TYPE, pkgName);
  const esReferences = so.attributes.installed_es ?? [];

  const authorizedTransformsRefs = authorizedTransforms.map((t) => ({
    type: ElasticsearchAssetType.transform,
    id: t.transformId,
    version: pkgVersion,
  }));
  await updateEsAssetReferences(savedObjectsClient, pkgName, esReferences, {
    assetsToRemove: esReferences.filter(
      (t) => t.type === ElasticsearchAssetType.transform && t.deferred === true
    ),
    assetsToAdd: authorizedTransformsRefs,
  });
  return authorizedTransformsRefs;
}
