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

export function getIndexPatternSavedObjects() {
  return indexPatternTypes.map((indexPatternType) => ({
    id: `${indexPatternType}-*`,
    type: INDEX_PATTERN_SAVED_OBJECT_TYPE,
    attributes: {
      title: `${indexPatternType}-*`,
      timeFieldName: '@timestamp',
      allowNoIndex: true,
    },
  }));
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

  return Promise.all(
    idsToDelete.map(async (id) => {
      try {
        logger.debug(`deleting index pattern ${id}`);
        await savedObjectsClient.delete(INDEX_PATTERN_SAVED_OBJECT_TYPE, id);
      } catch (err) {
        // index pattern was probably deleted by the user already
        logger.debug(`Non fatal error encountered deleting index pattern ${id} : ${err}`);
      }
      return;
    })
  );
}
