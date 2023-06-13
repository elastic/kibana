/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { savedObjectsServiceMock } from '@kbn/core/server/mocks';
import { makeLensEmbeddableFactory } from '@kbn/lens-plugin/server/embeddable/make_lens_embeddable_factory';

import { PersistableStateAttachmentTypeRegistry } from '../../../attachment_framework/persistable_state_registry';
import { createUserActionsMigrations } from '.';
import { mockUsersActions } from '../../../mocks';
import type {
  CommentRequestPersistableStateType,
  CommentUserActionPayloadWithoutIds,
} from '../../../../common/api';
import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type {
  SavedObjectMigrationFn,
  SavedObjectMigrationMap,
  SavedObjectMigrationParams,
  SavedObjectsMigrationLogger,
} from '@kbn/core-saved-objects-server';
import { omit, omitBy, partition, pickBy } from 'lodash';
import gte from 'semver/functions/gte';
import lt from 'semver/functions/lt';

type PersistableStateAttachmentUserAction = Omit<CommentUserActionPayloadWithoutIds, 'payload'> & {
  payload: { comment: CommentRequestPersistableStateType };
};

describe('user actions migrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('lens migrations', () => {
    it('should remove lens migrations before 8.10.0', () => {
      const lensMigrationObject = getLensMigrations();

      const embeddableMigrations = omitBy(lensMigrationObject, (_, version: string) =>
        lt(version, '8.10.0')
      );

      const migrations = createUserActionsMigrations({
        persistableStateAttachmentTypeRegistry: new PersistableStateAttachmentTypeRegistry(),
        lensEmbeddableFactory: () => ({
          id: 'test',
          migrations: lensMigrationObject,
        }),
      });

      const deferredMigrations = pickBy(
        migrations,
        (value: SavedObjectMigrationParams) => !!value.deferred
      );

      const totalDeferredMigrations = Object.keys(deferredMigrations).length;
      const totalLensMigrations = Object.keys(embeddableMigrations).length;

      expect(totalDeferredMigrations).toBe(totalLensMigrations);
    });

    it('should marked lens migrations as deferred correctly', () => {
      const lensMigrationObject = getLensMigrations();

      const lensMigrationObjectWithFakeMigration = {
        ...lensMigrationObject,
        '8.9.0': jest.fn(),
        '8.10.0': jest.fn(),
      };

      const lensVersions = Object.keys(lensMigrationObjectWithFakeMigration);
      const [lensVersionToBeDeferred, lensVersionToNotBeDeferred] = partition(
        lensVersions,
        (version) => gte(version, '8.10.0')
      );

      const migrations = createUserActionsMigrations({
        persistableStateAttachmentTypeRegistry: new PersistableStateAttachmentTypeRegistry(),
        lensEmbeddableFactory: () => ({
          id: 'test',
          migrations: lensMigrationObjectWithFakeMigration,
        }),
      });

      for (const version of lensVersionToBeDeferred) {
        const migration = migrations[version] as SavedObjectMigrationParams;
        expect(migration.deferred).toBe(true);
        expect(migration.transform).toEqual(expect.any(Function));
      }

      for (const version of lensVersionToNotBeDeferred) {
        /**
         * Lens migrations before 8.10.0 should not be merge
         * with the user action migrations. For this reason,
         * the migration will be either undefined or
         * the deferred property will not exists
         */
        const migration = migrations[version] as SavedObjectMigrationParams | undefined;
        expect(migration?.deferred).toBeUndefined();
      }

      const migrationsWithoutLens = omit<SavedObjectMigrationMap>(migrations, lensVersions);

      for (const version of Object.keys(migrationsWithoutLens)) {
        const migration = migrationsWithoutLens[version] as SavedObjectMigrationFn;

        expect(migration).toEqual(expect.any(Function));
      }
    });

    it('migrates correctly persistable state lens attachments', () => {
      const contextMock = savedObjectsServiceMock.createMigrationContext({
        migrationVersion: '8.10.0',
      });

      const lensUserAction =
        mockUsersActions[2] as unknown as SavedObject<PersistableStateAttachmentUserAction>;

      const persistableAttachmentState =
        lensUserAction.attributes.payload.comment.persistableStateAttachmentState;

      const migratedPersistableAttachmentState = {
        ...persistableAttachmentState,
        // @ts-expect-error: lens attributes can be spread
        attributes: { ...persistableAttachmentState.attributes, foo: 'bar' },
      };

      const migrateFunction = jest.fn().mockReturnValue(migratedPersistableAttachmentState);

      const migrations = createUserActionsMigrations({
        persistableStateAttachmentTypeRegistry: new PersistableStateAttachmentTypeRegistry(),
        lensEmbeddableFactory: () => ({
          id: 'test',
          migrations: { '8.10.0': migrateFunction },
        }),
      });

      const result = SavedObjectsUtils.getMigrationFunction(migrations['8.10.0'])(
        lensUserAction,
        contextMock
      );

      expect(result).toEqual({
        ...lensUserAction,
        attributes: {
          ...lensUserAction.attributes,
          payload: {
            ...lensUserAction.attributes.payload,
            comment: {
              ...lensUserAction.attributes.payload.comment,
              persistableStateAttachmentState: migratedPersistableAttachmentState,
            },
          },
        },
      });
    });

    it('logs and do not throw in case of a migration error', () => {
      const contextMock = savedObjectsServiceMock.createMigrationContext({
        migrationVersion: '8.10.0',
      });

      const lensUserAction =
        mockUsersActions[2] as unknown as SavedObject<PersistableStateAttachmentUserAction>;

      const migrateFunction = jest.fn().mockImplementation(() => {
        throw new Error('an error');
      });

      const migrations = createUserActionsMigrations({
        persistableStateAttachmentTypeRegistry: new PersistableStateAttachmentTypeRegistry(),
        lensEmbeddableFactory: () => ({
          id: 'test',
          migrations: { '8.10.0': migrateFunction },
        }),
      });

      const result = SavedObjectsUtils.getMigrationFunction(migrations['8.10.0'])(
        lensUserAction,
        contextMock
      );

      expect(result).toEqual(lensUserAction);

      const log = contextMock.log as jest.Mocked<SavedObjectsMigrationLogger>;
      expect(log.error.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Failed to migrate user action persistable lens attachment with doc id: mock-user-action-3 version: 8.10.0 error: an error",
          Object {
            "migrations": Object {
              "comment": Object {
                "id": "mock-user-action-3",
              },
            },
          },
        ]
      `);
    });
  });
});

const getLensMigrations = () => {
  const lensEmbeddableFactory = makeLensEmbeddableFactory(
    () => ({}),
    () => ({}),
    {}
  );

  const lensMigrations = lensEmbeddableFactory().migrations;
  const lensMigrationObject =
    typeof lensMigrations === 'function' ? lensMigrations() : lensMigrations || {};

  return lensMigrationObject;
};
