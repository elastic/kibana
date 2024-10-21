/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { IScopedClusterClient } from '@kbn/core/server';
import { ApiScraperDefinition } from '../../../../common/types';
import { componentTemplates } from './component_templates';
import { dataStreams } from './data_streams';
import { indexTemplates } from './index_templates';
import { ingestPipelines } from './ingest_pipelines';
import { createDefintion } from '../create_defintion';
import { BUILT_IN_API_KEY_ID } from '../../../../common/constants';

export const builtInApiScraperDefinitions: ApiScraperDefinition[] = [
  ingestPipelines,
  dataStreams,
  componentTemplates,
  indexTemplates,
];

interface InstallBuiltInDefinitionParams {
  logger: Logger;
  soClient: SavedObjectsClientContract;
  scopedClusterClient: IScopedClusterClient;
}

export async function installBuiltInDefinitions(params: InstallBuiltInDefinitionParams) {
  return Promise.all(
    builtInApiScraperDefinitions.map((definition) =>
      createDefintion({
        ...params,
        rawDefinition: { ...definition, apiKeyId: BUILT_IN_API_KEY_ID },
      })
    )
  );
}
