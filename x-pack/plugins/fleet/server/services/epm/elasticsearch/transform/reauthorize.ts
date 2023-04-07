/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type { SecondaryAuthorizationHeader } from '../../../../../common/types/models/transform_api_key';
import { updateEsAssetReferences } from '../../packages/install';
import type { Installation } from '../../../../../common';
import { ElasticsearchAssetType, PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common';

import { retryTransientEsErrors } from '../retry';

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
}): Promise<{ transformId: string; success: boolean; error: null | any }> {
  try {
    await retryTransientEsErrors(
      () =>
        esClient.transform.updateTransform(
          {
            transform_id: transformId,
            body: {},
          },
          { ...(secondaryAuth ? secondaryAuth : {}) }
        ),
      { logger, additionalResponseStatuses: [400] }
    );

    logger.debug(`Updated transform: ${transformId}`);
  } catch (err) {
    logger.error(`Failed to update transform: ${transformId} because ${err}`);
    return { transformId, success: false, error: err };
  }

  try {
    const startedTransform = await retryTransientEsErrors(
      () => esClient.transform.startTransform({ transform_id: transformId }, { ignore: [409] }),
      { logger, additionalResponseStatuses: [400] }
    );
    logger.debug(`Started transform: ${transformId}`);
    return { transformId, success: startedTransform.acknowledged, error: null };
  } catch (err) {
    logger.error(`Failed to start transform: ${transformId} because ${err}`);
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
  transforms: Array<{ transformId: string }>;
  pkgName: string;
  pkgVersion?: string;
  secondaryAuth?: SecondaryAuthorizationHeader;
  shouldInstallSequentially?: boolean;
}) {
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

  const successfullyAuthorizedTransforms = authorizedTransforms.filter((t) => t.success);
  const authorizedTransformsRefs = successfullyAuthorizedTransforms.map((t) => ({
    type: ElasticsearchAssetType.transform,
    id: t.transformId,
    version: pkgVersion,
  }));
  await updateEsAssetReferences(savedObjectsClient, pkgName, esReferences, {
    assetsToRemove: authorizedTransformsRefs,
    assetsToAdd: authorizedTransformsRefs,
  });
  return authorizedTransforms;
}
