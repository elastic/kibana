/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { Logger } from '@kbn/core/server';
import { FleetArtifactsClient } from '@kbn/fleet-plugin/server/services';
import { getApmArtifactClient } from '../fleet/source_maps';
import { bulkCreateApmSourceMapDocs } from './bulk_create_apm_source_map_docs';
import { APM_SOURCE_MAP_INDEX } from '../settings/apm_indices/get_apm_indices';

const PER_PAGE = 10;

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
    const newestMigratedArtifact = await getLatestSourceMapDoc(
      internalESClient
    );
    const createdDateFilter = newestMigratedArtifact
      ? ` AND created:>${newestMigratedArtifact.replaceAll(':', '\\:')}'` // kuery only supports lucene syntax
      : '';

    await paginateArtifacts({
      page: 1,
      apmArtifactClient: getApmArtifactClient(fleet),
      kuery: `type: sourcemap${createdDateFilter}`,
      logger,
      internalESClient,
    });
  } catch (e) {
    logger.error('Failed to migrate APM fleet source map artifacts');
    logger.error(e);
  }
}

async function getArtifactsForPage({
  page,
  apmArtifactClient,
  kuery,
}: {
  page: number;
  apmArtifactClient: FleetArtifactsClient;
  kuery: string;
}) {
  return await apmArtifactClient.listArtifacts({
    kuery,
    perPage: PER_PAGE,
    page,
    sortOrder: 'asc',
    sortField: 'created',
  });
}

async function paginateArtifacts({
  page,
  apmArtifactClient,
  kuery,
  logger,
  internalESClient,
}: {
  page: number;
  apmArtifactClient: FleetArtifactsClient;
  kuery: string;
  logger: Logger;
  internalESClient: ElasticsearchClient;
}) {
  const { total, items: artifacts } = await getArtifactsForPage({
    page,
    apmArtifactClient,
    kuery,
  });

  if (artifacts.length === 0) {
    logger.info('Source map migration: Nothing to migrate');
    return;
  }

  const migratedCount = (page - 1) * PER_PAGE + artifacts.length;
  logger.info(`Source map migration: Migrating ${migratedCount} of ${total}`);

  await bulkCreateApmSourceMapDocs({ artifacts, internalESClient });

  const hasMorePages = total > migratedCount;
  if (hasMorePages) {
    await paginateArtifacts({
      page: page + 1,
      apmArtifactClient,
      kuery,
      logger,
      internalESClient,
    });
  } else {
    logger.info(
      `Source map migration: Successfully migrated ${total} sourcemaps`
    );
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
