/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import pMap from 'p-map';

import type { EsAssetReference } from '../../../../types';

import { ElasticsearchAssetType } from '../../../../types';
import { getAssetFromAssetsMap, getPathParts } from '../../archive';
import { updateEsAssetReferences } from '../../packages/es_assets_reference';
import { getESAssetMetadata } from '../meta';
import { retryTransientEsErrors } from '../retry';
import { PackageInvalidArchiveError } from '../../../../errors';
import type { PackageInstallContext } from '../../../../../common/types';
import { MAX_CONCURRENT_ILM_POLICIES_OPERATIONS } from '../../../../constants';

export async function installILMPolicy(
  packageInstallContext: PackageInstallContext,
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  esReferences: EsAssetReference[]
): Promise<EsAssetReference[]> {
  const { packageInfo } = packageInstallContext;
  const ilmPaths = packageInstallContext.paths.filter((path) => isILMPolicy(path));
  if (!ilmPaths.length) return esReferences;

  const ilmPolicies = ilmPaths.map((path) => {
    const body = JSON.parse(
      getAssetFromAssetsMap(packageInstallContext.assetsMap, path).toString('utf-8')
    );

    body.policy._meta = getESAssetMetadata({ packageName: packageInfo.name });

    const { file } = getPathParts(path);
    const name = file.substr(0, file.lastIndexOf('.'));

    return { name, body };
  });

  esReferences = await updateEsAssetReferences(savedObjectsClient, packageInfo.name, esReferences, {
    assetsToAdd: ilmPolicies.map((policy) => ({
      type: ElasticsearchAssetType.ilmPolicy,
      id: policy.name,
    })),
  });

  await pMap(
    ilmPolicies,
    async (policy) => {
      try {
        await retryTransientEsErrors(
          () =>
            esClient.transport.request({
              method: 'PUT',
              path: '/_ilm/policy/' + policy.name,
              body: policy.body,
            }),
          { logger }
        );
      } catch (err) {
        throw new PackageInvalidArchiveError(`Couldn't install ilm policies: ${err.message}`);
      }
    },
    {
      concurrency: MAX_CONCURRENT_ILM_POLICIES_OPERATIONS,
    }
  );

  return esReferences;
}

const isILMPolicy = (path: string) => {
  const pathParts = getPathParts(path);
  return pathParts.type === ElasticsearchAssetType.ilmPolicy;
};
