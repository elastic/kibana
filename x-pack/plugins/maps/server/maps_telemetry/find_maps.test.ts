/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository } from '@kbn/core/server';
// @ts-ignore
import mapSavedObjects from './test_resources/sample_map_saved_objects.json';
import { findMaps } from './find_maps';

function getMockSavedObjectsClient(perPage: number) {
  return {
    find: async ({ page }: { page: number }) => {
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      const savedObjectsSlice =
        endIndex > mapSavedObjects.length
          ? mapSavedObjects.slice(startIndex)
          : mapSavedObjects.slice(startIndex, endIndex);
      return {
        total: mapSavedObjects.length,
        saved_objects: savedObjectsSlice,
        per_page: perPage,
        page,
      };
    },
  } as unknown as ISavedObjectsRepository;
}

test('should process all map saved objects with single page', async () => {
  const foundMapIds: string[] = [];
  await findMaps(getMockSavedObjectsClient(20), async (savedObject) => {
    foundMapIds.push(savedObject.id);
  });
  expect(foundMapIds).toEqual([
    '37b08d60-25b0-11e9-9858-0f3a1e60d007',
    '5c061dc0-25af-11e9-9858-0f3a1e60d007',
    'b853d5f0-25ae-11e9-9858-0f3a1e60d007',
    '643da1e6-c628-11ea-87d0-0242ac130003',
    '5efd136a-c628-11ea-87d0-0242ac130003',
  ]);
});

test('should process all map saved objects with with paging', async () => {
  const foundMapIds: string[] = [];
  await findMaps(getMockSavedObjectsClient(2), async (savedObject) => {
    foundMapIds.push(savedObject.id);
  });
  expect(foundMapIds).toEqual([
    '37b08d60-25b0-11e9-9858-0f3a1e60d007',
    '5c061dc0-25af-11e9-9858-0f3a1e60d007',
    'b853d5f0-25ae-11e9-9858-0f3a1e60d007',
    '643da1e6-c628-11ea-87d0-0242ac130003',
    '5efd136a-c628-11ea-87d0-0242ac130003',
  ]);
});
