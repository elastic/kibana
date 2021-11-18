/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from 'src/core/server';

import { dataTypes, installationStatuses } from '../../../../../common/constants';
import { appContextService } from '../../../../services';
import { getPackageSavedObjects } from '../../packages/get';
const INDEX_PATTERN_SAVED_OBJECT_TYPE = 'index-pattern';

export const indexPatternTypes = Object.values(dataTypes);

export async function installIndexPatterns(savedObjectsClient: SavedObjectsClientContract) {
  const logger = appContextService.getLogger();

  const indexPatterns = indexPatternTypes.map((indexPatternType) => `${indexPatternType}-*`);
  logger.debug(`creating index patterns ${indexPatterns}`);
  const kibanaIndexPatterns = indexPatterns.map((indexPattern) => ({
    id: indexPattern,
    type: INDEX_PATTERN_SAVED_OBJECT_TYPE,
    attributes: {
      title: indexPattern,
      timeFieldName: '@timestamp',
      allowNoIndex: true,
    },
  }));

  // create or overwrite the index patterns
  await savedObjectsClient.bulkCreate(kibanaIndexPatterns, {
    overwrite: true,
  });
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

  return Promise.all(
    indexPatternTypes.map(async (indexPatternType) => {
      const pattern = `${indexPatternType}-*`;
      try {
        logger.debug(`deleting index pattern ${pattern}`);
        await savedObjectsClient.delete(INDEX_PATTERN_SAVED_OBJECT_TYPE, `${pattern}`);
      } catch (err) {
        // index pattern was probably deleted by the user already
        logger.debug(`Non fatal error encountered deleting index pattern ${pattern} : ${err}`);
      }
      return;
    })
  );
}
