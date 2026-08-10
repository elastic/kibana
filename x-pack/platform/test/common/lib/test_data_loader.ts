/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LegacyUrlAlias } from '@kbn/core-saved-objects-base-server-internal';
import { ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';
import Fs from 'fs/promises';
import type { FtrProviderContext } from '../ftr_provider_context';

export const SPACE_1 = {
  id: 'space_1',
  name: 'Space 1',
  description: 'This is the first test space',
  disabledFeatures: [],
};

export const SPACE_2 = {
  id: 'space_2',
  name: 'Space 2',
  description: 'This is the second test space',
  disabledFeatures: [],
};

async function parseLegacyUrlAliases(path: string): Promise<LegacyUrlAlias[]> {
  return (await Fs.readFile(path, 'utf-8'))
    .split(/\r?\n\r?\n/)
    .filter((line) => !!line)
    .map((line) => JSON.parse(line));
}

// Objects can only be imported in one space at a time. To have test saved objects
// that are shared in multiple spaces we should import all objects in the "original"
// spaces first and then share them to other spaces as a subsequent operation.
const OBJECTS_TO_SHARE: Array<{
  spacesToAdd?: string[];
  spacesToRemove?: string[];
  objects: Array<{ type: string; id: string }>;
}> = [
  {
    spacesToAdd: ['*'],
    spacesToRemove: ['default'],
    objects: [
      { type: 'sharedtype', id: 'all_spaces' },
      { type: 'sharedtype', id: 'space_2_only_matching_origin' },
      { type: 'sharedtype', id: 'alias_delete_exclusive' },
    ],
  },
  {
    spacesToRemove: ['default'],
    spacesToAdd: [SPACE_1.id, SPACE_2.id],
    objects: [{ type: 'sharedtype', id: 'space_1_and_space_2' }],
  },
  {
    spacesToAdd: [SPACE_1.id, SPACE_2.id],
    objects: [
      { type: 'sharedtype', id: 'each_space' },
      { type: 'sharedtype', id: 'conflict_2_all' },
      { type: 'sharedtype', id: 'alias_delete_inclusive' },
    ],
  },
  {
    spacesToAdd: [SPACE_1.id],
    objects: [
      { type: 'sharedtype', id: 'conflict_1c_default_and_space_1' },
      { type: 'sharedtype', id: 'default_and_space_1' },
    ],
  },
  {
    spacesToAdd: [SPACE_2.id],
    objects: [{ type: 'sharedtype', id: 'default_and_space_2' }],
  },
  {
    spacesToAdd: [SPACE_1.id, SPACE_2.id],
    objects: [
      { type: 'resolvetype', id: 'exact-match' },
      { type: 'resolvetype', id: 'alias-match-newid' },
      { type: 'resolvetype', id: 'conflict-newid' },
      { type: 'sharedtype', id: 'conflict_1' },
      { type: 'sharedtype', id: 'conflict_3' },
      { type: 'sharedtype', id: 'conflict_4a' },
    ],
  },
  {
    spacesToAdd: ['*'],
    spacesToRemove: ['default'],
    objects: [
      { type: 'sharedtype', id: 'outbound-missing-reference-conflict-1' },
      { type: 'sharedtype', id: 'outbound-missing-reference-conflict-2a' },
      { type: 'index-pattern', id: 'inbound-reference-origin-match-1-newId' },
      { type: 'index-pattern', id: 'inbound-reference-origin-match-2a' },
      { type: 'index-pattern', id: 'inbound-reference-origin-match-2b' },
      { type: 'nestedtype', id: '1' },
      { type: 'nestedtype', id: '2' },
      { type: 'nestedtype', id: '3' },
      { type: 'nestedtype', id: '4' },
    ],
  },
];

// These resolve-specific objects are created directly in ES (bypassing the
// saved objects import API) because the import's origin-conflict detection
// search for the ID "conflict" collides with other objects in the index.
const RESOLVE_TEST_OBJECTS = [
  {
    _id: 'resolvetype:conflict',
    _source: {
      type: 'resolvetype',
      updated_at: '2017-09-21T18:51:23.794Z',
      resolvetype: { title: 'Resolve outcome conflict (1 of 2)' },
      namespaces: ['default', SPACE_1.id, SPACE_2.id],
    },
  },
  {
    _id: 'resolvetype:all_spaces',
    _source: {
      type: 'resolvetype',
      updated_at: '2017-09-21T18:51:23.794Z',
      resolvetype: {
        title:
          "This is used to test that 1. the 'disabled' alias does not resolve to this target (because the alias is disabled), and 2. when this object that exists in all spaces is deleted, the alias that targets it is deleted too (even though the alias is disabled)",
      },
      namespaces: ['*'],
    },
  },
];

// These conflict objects are created directly in ES because the import API
// doesn't preserve `updated_at`, and the _update_objects_spaces sharing call
// also overwrites it. Tests assert on the exact `title` and `updatedAt` of
// these objects in the ambiguous_conflict error response.
const CONFLICT_DEST_OBJECTS = [
  {
    _id: 'sharedtype:conflict_2a',
    _source: {
      originId: 'conflict_2',
      type: 'sharedtype',
      updated_at: '2017-09-21T18:59:16.270Z',
      sharedtype: { title: 'A shared saved-object in all spaces' },
      namespaces: ['default', SPACE_1.id, SPACE_2.id],
    },
  },
  {
    _id: 'sharedtype:conflict_2b',
    _source: {
      originId: 'conflict_2',
      type: 'sharedtype',
      updated_at: '2017-09-21T18:59:16.270Z',
      sharedtype: { title: 'A shared saved-object in all spaces' },
      namespaces: ['default', SPACE_1.id, SPACE_2.id],
    },
  },
];

export function getTestDataLoader({ getService }: Pick<FtrProviderContext, 'getService'>) {
  const spacesService = getService('spaces');
  const kbnServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  return {
    createFtrSpaces: async () => {
      await Promise.all([await spacesService.create(SPACE_1), await spacesService.create(SPACE_2)]);
    },

    deleteFtrSpaces: async () => {
      await Promise.all([spacesService.delete(SPACE_1.id), spacesService.delete(SPACE_2.id)]);
    },

    createFtrSavedObjectsData: async (
      spaceData: Array<{ spaceName: string | null; dataUrl: string }>
    ) => {
      log.debug('Loading test data for the following spaces: default, space_1 and space_2');

      await Promise.all(
        spaceData.map((spaceDataObj) => {
          if (spaceDataObj.spaceName) {
            return kbnServer.importExport.load(spaceDataObj.dataUrl, {
              space: spaceDataObj.spaceName,
            });
          } else {
            return kbnServer.importExport.load(spaceDataObj.dataUrl);
          }
        })
      );

      // Adjust spaces for the imported saved objects.
      for (const { objects, spacesToAdd = [], spacesToRemove = [] } of OBJECTS_TO_SHARE) {
        log.debug(
          `Updating spaces for the following objects (add: [${spacesToAdd.join(
            ', '
          )}], remove: [${spacesToRemove.join(', ')}]): ${objects
            .map(({ type, id }) => `${type}:${id}`)
            .join(', ')}`
        );
        await supertest
          .post('/api/spaces/_update_objects_spaces')
          .send({ objects, spacesToAdd, spacesToRemove })
          .expect(200);
      }

      // Ensure all sharing updates are visible to subsequent search operations.
      await es.indices.refresh({ index: ALL_SAVED_OBJECT_INDICES });

      // Create objects directly in ES that can't go through the import API.
      await Promise.all(
        [...RESOLVE_TEST_OBJECTS, ...CONFLICT_DEST_OBJECTS].map(async (obj) => {
          await es.index({
            id: obj._id,
            index: '.kibana',
            refresh: 'wait_for',
            document: obj._source,
          });
        })
      );
    },

    createLegacyUrlAliases: async (
      spaceData: Array<{ spaceName: string | null; dataUrl: string; disabled?: boolean }>
    ) => {
      await Promise.all(
        spaceData.map(async (data) => {
          const spaceString = data.spaceName ?? 'default';

          const aliases = await parseLegacyUrlAliases(data.dataUrl);
          log.info('creating', aliases.length, 'legacy URL aliases', {
            space: spaceString,
          });

          await Promise.all(
            aliases.map(async (alias) => {
              await es.index({
                id: `legacy-url-alias:${spaceString}:${alias.targetType}:${alias.sourceId}`,
                index: '.kibana',
                refresh: 'wait_for',
                document: {
                  type: 'legacy-url-alias',
                  updated_at: '2017-09-21T18:51:23.794Z',
                  'legacy-url-alias': {
                    ...alias,
                    targetNamespace: spaceString,
                    ...(data.disabled && { disabled: data.disabled }),
                  },
                },
              });
            })
          );
        })
      );
    },

    deleteFtrSavedObjectsData: async () => {
      const allSpacesIds = [
        ...(await spacesService.getAll()).map((space: { id: string }) => space.id),
        'non_existent_space',
      ];
      log.debug(`Removing data from the following spaces: ${allSpacesIds.join(', ')}`);
      await Promise.all(
        allSpacesIds.flatMap((spaceId) => [
          kbnServer.savedObjects.cleanStandardList({ space: spaceId }),
          kbnServer.savedObjects.clean({
            space: spaceId,
            types: ['sharedtype', 'isolatedtype', 'resolvetype'],
          }),
        ])
      );
    },

    deleteAllSavedObjectsFromKibanaIndex: async () => {
      await es.deleteByQuery({
        index: ALL_SAVED_OBJECT_INDICES,
        ignore_unavailable: true,
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        query: {
          bool: {
            must_not: [
              {
                term: {
                  type: {
                    value: 'space',
                  },
                },
              },
            ],
          },
        },
      });
    },
  };
}
