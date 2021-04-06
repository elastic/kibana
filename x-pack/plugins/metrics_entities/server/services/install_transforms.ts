/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from 'kibana/server';

import { Transforms } from '../modules/types';
import type { Logger } from '../../../../../src/core/server';

import { computeMappingId, computeTransformId, getTransformExists } from './utils';
import { logTransformError } from './utils/log_transform_error';
import { logTransformDebug } from './utils/log_transform_debug';

interface CreateTransformOptions {
  esClient: ElasticsearchClient;
  transforms: Transforms[];
  autoStart: boolean;
  indices: string[];
  frequency: string;
  logger: Logger;
  query: object;
  docsPerSecond: number | null;
  maxPageSearchSize: number;
  sync: {
    time: {
      delay: string;
      field: string;
    };
  };
  prefix: string;
  suffix: string;
}

export const installTransforms = async ({
  autoStart,
  esClient,
  frequency,
  indices,
  docsPerSecond,
  logger,
  maxPageSearchSize,
  prefix,
  suffix,
  transforms,
  query,
  sync,
}: CreateTransformOptions): Promise<void> => {
  for (const transform of transforms) {
    // If the user doesn't define an explicit mapping in the module then use the default
    // of the transform id as the mapping index.
    const destIndex = transform?.dest?.index ?? transform.id;
    const computedMappingIndex = computeMappingId({ id: destIndex, prefix, suffix });
    const { id, ...transformNoId } = {
      ...transform,
      ...{ source: { ...transform.source, index: indices, query } },
      ...{ dest: { ...transform.dest, index: computedMappingIndex } },
      ...{
        settings: {
          ...transform.settings,
          docs_per_second: docsPerSecond,
          max_page_search_size: maxPageSearchSize,
        },
      },
      frequency,
      sync,
    };

    const computedName = computeTransformId({ id, prefix, suffix });
    const exists = await getTransformExists(esClient, computedName);
    if (!exists) {
      try {
        logTransformDebug({
          id: computedName,
          logger,
          message: 'does not exist, creating the transform',
        });
        await esClient.transform.putTransform({
          body: transformNoId,
          defer_validation: true,
          transform_id: computedName,
        });

        if (autoStart) {
          logTransformDebug({
            id: computedName,
            logger,
            message: 'is being auto started',
          });
          await esClient.transform.startTransform({
            transform_id: computedName,
          });
        } else {
          logTransformDebug({
            id: computedName,
            logger,
            message: 'is not being auto started',
          });
        }
      } catch (error) {
        logTransformError({
          error,
          id: computedName,
          logger,
          message: 'Could not create and/or start',
          postBody: transformNoId,
        });
      }
    } else {
      logTransformDebug({
        id: computedName,
        logger,
        message: 'already exists. It will not be recreated',
      });
    }
  }
};
