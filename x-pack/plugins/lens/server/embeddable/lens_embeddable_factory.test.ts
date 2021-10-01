/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverGte from 'semver/functions/gte';
import { lensEmbeddableFactory } from './lens_embeddable_factory';
import { migrations } from '../migrations/saved_object_migrations';

describe('saved object migrations and embeddable migrations', () => {
  test('should have same versions registered (>7.13.0)', () => {
    const savedObjectMigrationVersions = Object.keys(migrations).filter((version) => {
      return semverGte(version, '7.13.1');
    });
    const embeddableMigrationVersions = lensEmbeddableFactory()?.migrations;
    if (embeddableMigrationVersions) {
      expect(savedObjectMigrationVersions.sort()).toEqual(
        Object.keys(embeddableMigrationVersions).sort()
      );
    }
  });
});
