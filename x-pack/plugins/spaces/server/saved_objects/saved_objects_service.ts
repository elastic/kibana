/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup } from '@kbn/core/server';

import { SpacesSavedObjectMappings, UsageStatsMappings } from './mappings';
import { spaceMigrations, usageStatsMigrations } from './migrations';
import { SavedObjectsSpacesExtension } from './saved_objects_spaces_extension';
import { SpacesSavedObjectSchemas } from './schemas';
import type { SpacesServiceStart } from '../spaces_service';
import { SPACES_USAGE_STATS_TYPE } from '../usage_stats';

interface SetupDeps {
  core: Pick<CoreSetup, 'savedObjects' | 'getStartServices'>;
  getSpacesService: () => SpacesServiceStart;
}

export class SpacesSavedObjectsService {
  public setup({ core, getSpacesService }: SetupDeps) {
    core.savedObjects.registerType({
      name: 'space',
      hidden: true,
      namespaceType: 'agnostic',
      mappings: SpacesSavedObjectMappings,
      schemas: SpacesSavedObjectSchemas,
      migrations: {
        '6.6.0': spaceMigrations.migrateTo660,
      },
      modelVersions: {
        1: {
          changes: [
            {
              type: 'mappings_addition',
              addedMappings: {
                solution: { type: 'keyword' },
              },
            },
          ],
          schemas: {
            create: SpacesSavedObjectSchemas['8.8.0'].extends({
              solution: schema.maybe(
                schema.oneOf([
                  schema.literal('security'),
                  schema.literal('oblt'),
                  schema.literal('es'),
                  schema.literal('classic'),
                ])
              ),
            }),
          },
        },
        2: {
          changes: [
            {
              type: 'mappings_addition',
              addedMappings: {
                disabledFeatures: { type: 'keyword' },
              },
            },
          ],
        },
      },
    });

    core.savedObjects.registerType({
      name: SPACES_USAGE_STATS_TYPE,
      hidden: true,
      namespaceType: 'agnostic',
      mappings: UsageStatsMappings,
      migrations: {
        '7.14.1': usageStatsMigrations.migrateTo7141,
      },
    });

    core.savedObjects.setSpacesExtension(({ request }) => {
      const spacesService = getSpacesService();
      const spacesClient = spacesService.createSpacesClient(request);
      const activeSpaceId = spacesService.getSpaceId(request);
      return new SavedObjectsSpacesExtension({ spacesClient, activeSpaceId });
    });
  }
}
