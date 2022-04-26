/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import { ISavedObjectsRepository } from '@kbn/core/server';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { MapSavedObject, MapSavedObjectAttributes } from '../../common/map_saved_object_type';

export async function findMaps(
  savedObjectsClient: Pick<ISavedObjectsRepository, 'find'>,
  callback: (savedObject: MapSavedObject) => Promise<void>
) {
  let nextPage = 1;
  let hasMorePages = false;
  do {
    const results = await savedObjectsClient.find<MapSavedObjectAttributes>({
      type: MAP_SAVED_OBJECT_TYPE,
      page: nextPage,
    });
    await asyncForEach(results.saved_objects, async (savedObject) => {
      await callback(savedObject);
    });
    nextPage++;
    hasMorePages = results.page * results.per_page <= results.total;
  } while (hasMorePages);
}
