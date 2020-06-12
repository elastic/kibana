/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallESAsCurrentUser, ElasticsearchAssetType } from '../../../../types';
import * as Registry from '../../registry';

export async function installILMPolicy(paths: string[], callCluster: CallESAsCurrentUser) {
  const ilmPaths = paths.filter((path) => isILMPolicy(path));
  if (!ilmPaths.length) return;
  await Promise.all(
    ilmPaths.map(async (path) => {
      const body = Registry.getAsset(path).toString('utf-8');
      const { file } = Registry.pathParts(path);
      const name = file.substr(0, file.lastIndexOf('.'));
      try {
        if (await policyExists(name, callCluster)) return;
        await callCluster('transport.request', {
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
  const pathParts = Registry.pathParts(path);
  return pathParts.type === ElasticsearchAssetType.ilmPolicy;
};
export async function policyExists(
  name: string,
  callCluster: CallESAsCurrentUser
): Promise<boolean> {
  const response = await callCluster('transport.request', {
    method: 'GET',
    path: '/_ilm/policy/?filter_path=' + name,
  });

  // If the response contains a key, it means the policy exists
  return Object.keys(response).length > 0;
}
