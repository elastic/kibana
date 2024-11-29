/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { sortBy, uniqBy } from 'lodash';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { ErrorResponseBase } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { SecondaryAuthorizationHeader } from '../../../../../common/types/models/transform_api_key';
import { updateEsAssetReferences } from '../../packages/es_assets_reference';
import type { Installation } from '../../../../../common';
import { ElasticsearchAssetType, PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common';

import { retryTransientEsErrors } from '../retry';

interface FleetTransformMetadata {
  fleet_transform_version?: string;
  order?: number;
  package?: { name: string };
  managed?: boolean;
  managed_by?: string;
  installed_by?: string;
  last_authorized_by?: string;
  run_as_kibana_system?: boolean;
  transformId: string;
}

const isErrorResponse = (arg: unknown): arg is ErrorResponseBase =>
  isPopulatedObject(arg, ['error']);

async function reauthorizeAndStartTransform({
  esClient,
  logger,
  transformId,
  secondaryAuth,
  meta,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  transformId: string;
  secondaryAuth?: SecondaryAuthorizationHeader;
  shouldInstallSequentially?: boolean;
  meta?: object;
}): Promise<{ transformId: string; success: boolean; error: null | any }> {
  try {
    await retryTransientEsErrors(
      () =>
        esClient.transform.updateTransform(
          {
            transform_id: transformId,
            body: { _meta: meta },
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

    // Transform can already be started even without sufficient permission if 'unattended: true'
    // So we are just catching that special case to showcase in the UI
    // If unattended, calling _start will return a successful response, but with the error message in the body
    if (
      isErrorResponse(startedTransform) &&
      startedTransform.status === 409 &&
      Array.isArray(startedTransform.error?.root_cause) &&
      startedTransform.error.root_cause[0]?.reason?.includes('already started')
    ) {
      return { transformId, success: true, error: null };
    }

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
  username,
}: {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  transforms: Array<{ transformId: string }>;
  pkgName: string;
  pkgVersion?: string;
  secondaryAuth?: SecondaryAuthorizationHeader;
  username?: string;
}): Promise<Array<{ transformId: string; success: boolean; error: null | any }>> {
  if (!secondaryAuth) {
    throw Error(
      'A valid secondary authorization with sufficient `manage_transform` permission is needed to re-authorize and start transforms. ' +
        'This could be because security is not enabled, or API key cannot be generated.'
    );
  }

  const transformInfos = await Promise.all(
    transforms.map(({ transformId }) =>
      retryTransientEsErrors(
        () =>
          esClient.transform.getTransform(
            {
              transform_id: transformId,
            },
            { ...(secondaryAuth ? secondaryAuth : {}), ignore: [404] }
          ),
        { logger, additionalResponseStatuses: [400] }
      )
    )
  );

  const transformsMetadata: FleetTransformMetadata[] = transformInfos
    .flat()
    .filter((t) => t.transforms !== undefined)
    .map<FleetTransformMetadata>((t) => {
      const transform = t.transforms?.[0];
      return { ...transform._meta, transformId: transform?.id };
    })
    .filter((t) => t?.run_as_kibana_system === false);

  const shouldInstallSequentially =
    uniqBy(transformsMetadata, 'order').length === transforms.length;

  let authorizedTransforms = [];

  if (shouldInstallSequentially) {
    const sortedTransformsMetadata = sortBy(transformsMetadata, [
      (t) => t.package?.name,
      (t) => t.fleet_transform_version,
      (t) => t.order,
    ]);

    for (const { transformId, ...meta } of sortedTransformsMetadata) {
      const authorizedTransform = await reauthorizeAndStartTransform({
        esClient,
        logger,
        transformId,
        secondaryAuth,
        meta: { ...meta, last_authorized_by: username },
      });

      authorizedTransforms.push(authorizedTransform);
    }
  } else {
    // Else, create & start all the transforms at once for speed
    const transformsPromises = transformsMetadata.map(async ({ transformId, ...meta }) => {
      return await reauthorizeAndStartTransform({
        esClient,
        logger,
        transformId,
        secondaryAuth,
        meta: { ...meta, last_authorized_by: username },
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
