/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { InstallablePackage } from '../../../../types';

import { ElasticsearchAssetType } from '../../../../types';
import { getAsset, getPathParts } from '../../archive';
import { getESAssetMetadata } from '../meta';
import { retryTransientEsErrors } from '../retry';

export async function installILMPolicy(
  packageInfo: InstallablePackage,
  paths: string[],
  esClient: ElasticsearchClient,
  logger: Logger
) {
  const ilmPaths = paths.filter((path) => isILMPolicy(path));
  if (!ilmPaths.length) return;
  await Promise.all(
    ilmPaths.map(async (path) => {
      const body = JSON.parse(getAsset(path).toString('utf-8'));

      body.policy._meta = getESAssetMetadata({ packageName: packageInfo.name });

      const { file } = getPathParts(path);
      const name = file.substr(0, file.lastIndexOf('.'));
      try {
        await retryTransientEsErrors(
          () =>
            esClient.transport.request({
              method: 'PUT',
              path: '/_ilm/policy/' + name,
              body,
            }),
          { logger }
        );
      } catch (err) {
        throw new Error(err.message);
      }
    })
  );
}

const isILMPolicy = (path: string) => {
  const pathParts = getPathParts(path);
  return pathParts.type === ElasticsearchAssetType.ilmPolicy;
};
