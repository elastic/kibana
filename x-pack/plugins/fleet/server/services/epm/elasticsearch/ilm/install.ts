/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'kibana/server';

import { ElasticsearchAssetType } from '../../../../types';
import { getAsset, getPathParts } from '../../archive';

export async function installILMPolicy(paths: string[], esClient: ElasticsearchClient) {
  const ilmPaths = paths.filter((path) => isILMPolicy(path));
  if (!ilmPaths.length) return;
  await Promise.all(
    ilmPaths.map(async (path) => {
      const body = getAsset(path).toString('utf-8');
      const { file } = getPathParts(path);
      const name = file.substr(0, file.lastIndexOf('.'));
      try {
        await esClient.transport.request({
          method: 'PUT',
          path: '/_ilm/policy/' + name,
          body,
        });
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
