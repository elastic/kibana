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
import {
  bulkCreateSourceMapDocs,
  getLatestSourceMapDoc,
} from './create_source_map_doc';

export async function migrateFleetSourceMapArtifacts({
  fleet,
  internalESClient,
  logger,
}: {
  fleet?: FleetStartContract;
  internalESClient: ElasticsearchClient;
  logger: Logger;
}) {
  if (!fleet) {
    return;
  }

  const highestCreatedDate = await getLatestSourceMapDoc(internalESClient);
  const createdDateFilter = highestCreatedDate
    ? ` AND created:>${highestCreatedDate.replaceAll(':', '\\:')}'` // lucene syntax
    : '';

  try {
    const apmArtifactClient = getApmArtifactClient(fleet);
    const artifactsResponse = await apmArtifactClient.listArtifacts({
      kuery: `type: sourcemap${createdDateFilter}`,
      perPage: 50,
      page: 1,
      sortOrder: 'asc',
      sortField: 'created',
    });

    const artifacts = artifactsResponse.items;

    if (artifacts.length === 0) {
      logger.info('Source map migration: Nothing to migrate');
      return;
    }

    logger.info(
      `Source map migration: migrating ${artifacts.length} sourcemaps`
    );

    await bulkCreateSourceMapDocs({ artifacts, internalESClient });

    logger.info(
      `Source map migration: successfully migrated ${artifacts.length} sourcemaps`
    );
  } catch (e) {
    logger.error('Failed to migrate APM fleet source map artifacts');
    logger.error(e);
  }
}
