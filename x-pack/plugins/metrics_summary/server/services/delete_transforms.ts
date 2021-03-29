/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from 'kibana/server';

import { ModuleNames, installableMappings, installableTransforms } from '../modules';

import { uninstallMappings } from './uninstall_mappings';
import { uninstallTransforms } from './uninstall_transforms';

interface DeleteTransformsOptions {
  esClient: ElasticsearchClient;
  modules: ModuleNames[];
  prefix: string;
  suffix: string;
}

export const deleteTransforms = async ({
  esClient,
  modules,
  prefix,
  suffix,
}: DeleteTransformsOptions): Promise<void> => {
  for (const moduleName of modules) {
    const mappings = installableMappings[moduleName];
    const transforms = installableTransforms[moduleName];

    await uninstallTransforms({ esClient, moduleName, prefix, suffix, transforms });
    await uninstallMappings({ esClient, mappings, moduleName, prefix, suffix });
  }
};
