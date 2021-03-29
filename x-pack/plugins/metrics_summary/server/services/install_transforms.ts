/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from 'kibana/server';

import { Transforms } from '../modules/types';

import { computeMappingId, computeTransformId, getTransformExists } from './utils';

interface CreateTransformOptions {
  esClient: ElasticsearchClient;
  transforms: Transforms[];
  autoStart: boolean;
  indices: string[];
  frequency: string;
  query: object;
  docsPerSecond: number | null;
  maxPageSearchSize: number;
  sync: {
    time: {
      delay: string;
      field: string;
    };
  };
  moduleName: string;
  prefix: string;
  suffix: string;
}

export const installTransforms = async ({
  autoStart,
  esClient,
  frequency,
  indices,
  docsPerSecond,
  maxPageSearchSize,
  moduleName,
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
    const computedMappingIndex = computeMappingId({ id: destIndex, moduleName, prefix, suffix });
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

    const computedName = computeTransformId({ id, moduleName, prefix, suffix });
    const exists = await getTransformExists(esClient, computedName);
    if (!exists) {
      try {
        await esClient.transform.putTransform({
          body: transformNoId,
          defer_validation: true,
          transform_id: computedName,
        });
        if (autoStart) {
          await esClient.transform.startTransform({
            transform_id: computedName,
          });
        }
      } catch (error) {
        // TODO: Logging statement goes here
      }
    }
  }
};
