/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import pMap from 'p-map';

import { appContextService } from '../../..';
import { ElasticsearchAssetType } from '../../../../types';
import { FleetError } from '../../../../errors';
import type { EsAssetReference } from '../../../../../common/types';
import { updateEsAssetReferences } from '../../packages/es_assets_reference';
import { MAX_CONCURRENT_PIPELINES_DELETIONS } from '../../../../constants';

export const deletePreviousPipelines = async (
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  previousPkgVersion: string,
  esReferences: EsAssetReference[]
) => {
  const logger = appContextService.getLogger();
  const installedPipelines = esReferences.filter(
    ({ type, id }) =>
      type === ElasticsearchAssetType.ingestPipeline && id.includes(previousPkgVersion)
  );
  try {
    await pMap(
      installedPipelines,
      ({ type, id }) => {
        logger.debug(`Deleting pipeline with id: ${id}`);
        return deletePipeline(esClient, id);
      },
      {
        concurrency: MAX_CONCURRENT_PIPELINES_DELETIONS,
      }
    );
  } catch (e) {
    logger.error(e);
  }

  return await updateEsAssetReferences(savedObjectsClient, pkgName, esReferences, {
    assetsToRemove: esReferences.filter(({ type, id }) => {
      return type === ElasticsearchAssetType.ingestPipeline && id.includes(previousPkgVersion);
    }),
  });
};

export async function deletePipeline(esClient: ElasticsearchClient, id: string): Promise<void> {
  // '*' shouldn't ever appear here, but it still would delete all ingest pipelines
  if (id && id !== '*') {
    try {
      await esClient.ingest.deletePipeline({ id });
    } catch (err) {
      // Only throw if error is not a 404 error. Sometimes the pipeline is already deleted, but we have
      // duplicate references to them, see https://github.com/elastic/kibana/issues/91192
      if (err.statusCode !== 404) {
        throw new FleetError(`error deleting pipeline ${id}: ${err}`);
      }
    }
  }
}
