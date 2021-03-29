/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from 'kibana/server';

import { Transforms } from '../modules/types';

import { computeTransformId, getTransformExists } from './utils';

interface UninstallTransformsOptions {
  esClient: ElasticsearchClient;
  transforms: Transforms[];
  moduleName: string;
  prefix: string;
  suffix: string;
}

/**
 * Uninstalls all the transforms underneath a given module
 */
export const uninstallTransforms = async ({
  esClient,
  moduleName,
  prefix,
  suffix,
  transforms,
}: UninstallTransformsOptions): Promise<void> => {
  transforms.forEach(async (transform) => {
    const { id } = transform;
    const computedId = computeTransformId({ id, moduleName, prefix, suffix });
    const exists = await getTransformExists(esClient, computedId);
    if (exists) {
      try {
        await esClient.transform.stopTransform({
          allow_no_match: true,
          force: true,
          timeout: '5s',
          transform_id: computedId,
          wait_for_completion: true,
        });
      } catch (error) {
        // This can happen from a timeout, go ahead and try to delete it even if
        // the stop did not happen correctly
        // TODO: Logging statement goes here
      }
      try {
        await esClient.transform.deleteTransform({
          force: true,
          transform_id: computedId,
        });
      } catch (error) {
        // TODO: Logging statement goes here
      }
    }
  });
};
