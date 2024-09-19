/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';

import { ModuleNames, installableMappings, installableTransforms } from '../modules';
import type { Logger } from '../../../../../src/core/server';

import { installMappings } from './install_mappings';
import { installTransforms } from './install_transforms';

interface PostTransformsOptions {
  logger: Logger;
  esClient: ElasticsearchClient;
  modules: ModuleNames[];
  autoStart: boolean;
  frequency: string;
  indices: string[];
  docsPerSecond: number | undefined;
  kibanaVersion: string;
  maxPageSearchSize: number;
  query: object;
  prefix: string;
  suffix: string;
  sync: {
    time: {
      delay: string;
      field: string;
    };
  };
}

export const postTransforms = async ({
  autoStart,
  logger,
  esClient,
  frequency,
  indices,
  docsPerSecond,
  kibanaVersion,
  maxPageSearchSize,
  modules,
  prefix,
  suffix,
  query,
  sync,
}: PostTransformsOptions): Promise<void> => {
  for (const moduleName of modules) {
    const mappings = installableMappings[moduleName];
    const transforms = installableTransforms[moduleName];

    await installMappings({ esClient, kibanaVersion, logger, mappings, prefix, suffix });
    await installTransforms({
      autoStart,
      docsPerSecond,
      esClient,
      frequency,
      indices,
      logger,
      maxPageSearchSize,
      prefix,
      query,
      suffix,
      sync,
      transforms,
    });
  }
};
