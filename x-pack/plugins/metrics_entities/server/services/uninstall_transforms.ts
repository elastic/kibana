/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { asyncForEach } from '@kbn/std';

import { Transforms } from '../modules/types';
import type { Logger } from '../../../../../src/core/server';

import {
  computeTransformId,
  getTransformExists,
  logTransformError,
  logTransformInfo,
} from './utils';

interface UninstallTransformsOptions {
  esClient: ElasticsearchClient;
  transforms: Transforms[];
  prefix: string;
  suffix: string;
  logger: Logger;
}

/**
 * Uninstalls all the transforms underneath a given module
 */
export const uninstallTransforms = async ({
  esClient,
  logger,
  prefix,
  suffix,
  transforms,
}: UninstallTransformsOptions): Promise<void> => {
  await asyncForEach(transforms, async (transform) => {
    const { id } = transform;
    const computedId = computeTransformId({ id, prefix, suffix });
    const exists = await getTransformExists(esClient, computedId);
    if (exists) {
      logTransformInfo({
        id: computedId,
        logger,
        message: 'stopping transform',
      });
      try {
        await esClient.transform.stopTransform({
          allow_no_match: true,
          force: true,
          timeout: '5s',
          transform_id: computedId,
          wait_for_completion: true,
        });
      } catch (error) {
        logTransformError({
          error,
          id: computedId,
          logger,
          message: 'Could not stop transform, still attempting to delete it',
          postBody: undefined,
        });
      }
      logTransformInfo({
        id: computedId,
        logger,
        message: 'deleting transform',
      });
      try {
        await esClient.transform.deleteTransform({
          force: true,
          transform_id: computedId,
        });
      } catch (error) {
        logTransformError({
          error,
          id: computedId,
          logger,
          message: 'Could not create and/or start',
          postBody: undefined,
        });
      }
    } else {
      logTransformInfo({
        id: computedId,
        logger,
        message: 'transform does not exist to delete',
      });
    }
  });
};
