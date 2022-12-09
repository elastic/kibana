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
import { bulkCreateApmSourceMapDocs } from './bulk_create_apm_source_map_docs';
import { APM_SOURCE_MAP_INDEX } from '../settings/apm_indices/get_apm_indices';

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

  try {
    const highestCreatedDate = await getLatestSourceMapDoc(internalESClient);
    const createdDateFilter = highestCreatedDate
      ? ` AND created:>${highestCreatedDate.replaceAll(':', '\\:')}'` // lucene syntax
      : '';

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
      `Source map migration: Migrating ${artifacts.length} sourcemaps`
    );

    await bulkCreateApmSourceMapDocs({ artifacts, internalESClient });

    logger.info(
      `Source map migration: Successfully migrated ${artifacts.length} sourcemaps`
    );
  } catch (e) {
    logger.error('Failed to migrate APM fleet source map artifacts');
    logger.error(e);
  }
}

async function getLatestSourceMapDoc(internalESClient: ElasticsearchClient) {
  const params = {
    index: APM_SOURCE_MAP_INDEX,
    size: 1,
    _source: ['created'],
    sort: [{ created: { order: 'desc' } }],
    body: {
      query: { match_all: {} },
    },
  };
  const res = await internalESClient.search<{ created: string }>(params);
  return res.hits.hits[0]?._source?.created;
}
