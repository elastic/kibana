/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverGte from 'semver/functions/gte';
import { makeLensEmbeddableFactory } from './make_lens_embeddable_factory';
import { getAllMigrations } from '../migrations/saved_object_migrations';

describe('saved object migrations and embeddable migrations', () => {
  test('should have same versions registered (>7.13.0)', () => {
    const savedObjectMigrationVersions = Object.keys(getAllMigrations({})).filter((version) => {
      return semverGte(version, '7.13.1');
    });
    const embeddableMigrationVersions = makeLensEmbeddableFactory({})()?.migrations;
    if (embeddableMigrationVersions) {
      expect(savedObjectMigrationVersions.sort()).toEqual(
        Object.keys(embeddableMigrationVersions).sort()
      );
    }
  });

  test('should properly apply a filter migration within a lens visualization', () => {
    const migrationVersion = 'some-version';

    const lensVisualizationDoc = {
      attributes: {
        state: {
          filters: [
            {
              filter: 1,
              migrated: false,
            },
            {
              filter: 2,
              migrated: false,
            },
          ],
        },
      },
    };

    const embeddableMigrationVersions = makeLensEmbeddableFactory({
      [migrationVersion]: (filterState) => {
        return {
          ...filterState,
          migrated: true,
        };
      },
    })()?.migrations;

    const migratedLensDoc = embeddableMigrationVersions?.[migrationVersion](lensVisualizationDoc);

    expect(migratedLensDoc).toEqual({
      attributes: {
        state: {
          filters: [
            {
              filter: 1,
              migrated: true,
            },
            {
              filter: 2,
              migrated: true,
            },
          ],
        },
      },
    });
  });
});
