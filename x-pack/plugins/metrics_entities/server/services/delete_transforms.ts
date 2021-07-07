/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';

import { ModuleNames, installableMappings, installableTransforms } from '../modules';
import type { Logger } from '../../../../../src/core/server';

import { uninstallMappings } from './uninstall_mappings';
import { uninstallTransforms } from './uninstall_transforms';

interface DeleteTransformsOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  modules: ModuleNames[];
  prefix: string;
  suffix: string;
}

export const deleteTransforms = async ({
  esClient,
  logger,
  modules,
  prefix,
  suffix,
}: DeleteTransformsOptions): Promise<void> => {
  for (const moduleName of modules) {
    const mappings = installableMappings[moduleName];
    const transforms = installableTransforms[moduleName];

    await uninstallTransforms({ esClient, logger, prefix, suffix, transforms });
    await uninstallMappings({ esClient, logger, mappings, prefix, suffix });
  }
};
