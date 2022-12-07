/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { Logger } from '@kbn/core/server';
import { getApmArtifactClient } from '../fleet/source_maps';
import { bulkCreateSourceMapDocs } from './create_source_map_doc';

export async function migrateFleetSourceMapArtifacts(
  fleet: FleetStartContract,
  internalEsClient: ElasticsearchClient,
  logger: Logger
) {
  try {
    const apmArtifactClient = getApmArtifactClient(fleet);
    const artifactsResponse = await apmArtifactClient.listArtifacts({
      kuery: 'type: sourcemap',
      perPage: 50,
      page: 1,
      sortOrder: 'desc',
      sortField: 'created',
    });

    const artifacts = artifactsResponse.items;
    await bulkCreateSourceMapDocs(artifacts, internalEsClient);
  } catch (e) {
    logger.error('Failed to migrate APM fleet source map artifacts');
    logger.error(e);
  }
}
