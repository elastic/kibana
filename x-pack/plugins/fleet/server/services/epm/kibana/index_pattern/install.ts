/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import pMap from 'p-map';

import { dataTypes, installationStatuses } from '../../../../../common/constants';
import { appContextService } from '../../..';
import { getPackageSavedObjects } from '../../packages/get';
const INDEX_PATTERN_SAVED_OBJECT_TYPE = 'index-pattern';
const MAX_CONCURRENT_INDEX_PATTERN_DELETIONS = 50;

export const indexPatternTypes = [dataTypes.Logs, dataTypes.Metrics];

export function getIndexPatternSavedObjects() {
  return indexPatternTypes.map((indexPatternType) => ({
    id: `${indexPatternType}-*`,
    type: INDEX_PATTERN_SAVED_OBJECT_TYPE,
    // workaround until https://github.com/elastic/kibana/issues/164454 is fixed
    typeMigrationVersion: '8.0.0',
    attributes: {
      title: `${indexPatternType}-*`,
      timeFieldName: '@timestamp',
      allowNoIndex: true,
    },
  }));
}

export async function makeManagedIndexPatternsGlobal(
  savedObjectsClient: SavedObjectsClientContract
) {
  const logger = appContextService.getLogger();

  const results = [];

  for (const indexPatternType of indexPatternTypes) {
    try {
      const result = await savedObjectsClient.updateObjectsSpaces(
        [{ id: `${indexPatternType}-*`, type: INDEX_PATTERN_SAVED_OBJECT_TYPE }],
        ['*'],
        []
      );

      results.push(result);
    } catch (error) {
      logger.error(`Error making managed index patterns global: ${error.message}`);
    }
  }

  return results;
}

export async function removeUnusedIndexPatterns(savedObjectsClient: SavedObjectsClientContract) {
  const logger = appContextService.getLogger();
  // get all user installed packages
  const installedPackagesRes = await getPackageSavedObjects(savedObjectsClient);
  const installedPackagesSavedObjects = installedPackagesRes.saved_objects.filter(
    (so) => so.attributes.install_status === installationStatuses.Installed
  );

  if (installedPackagesSavedObjects.length > 0) {
    return [];
  }

  const patternsToDelete = indexPatternTypes.map((indexPatternType) => `${indexPatternType}-*`);

  const { resolved_objects: resolvedObjects } = await savedObjectsClient.bulkResolve(
    patternsToDelete.map((pattern) => ({ id: pattern, type: INDEX_PATTERN_SAVED_OBJECT_TYPE }))
  );

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const idsToDelete = resolvedObjects.map(({ saved_object }) => saved_object.id);
  await pMap(
    idsToDelete,
    async (id) => {
      try {
        logger.debug(`deleting index pattern ${id}`);
        await savedObjectsClient.delete(INDEX_PATTERN_SAVED_OBJECT_TYPE, id);
      } catch (err) {
        // index pattern was probably deleted by the user already
        logger.debug(`Non fatal error encountered deleting index pattern ${id} : ${err}`);
      }
      return;
    },
    {
      concurrency: MAX_CONCURRENT_INDEX_PATTERN_DELETIONS,
    }
  );
}
