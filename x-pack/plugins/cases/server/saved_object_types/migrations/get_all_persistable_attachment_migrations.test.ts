/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type { PersistableStateAttachmentTypeSetup } from '../../attachment_framework/types';
import { getAllPersistableAttachmentMigrations } from './get_all_persistable_attachment_migrations';

describe('getAllPersistableAttachmentMigrations', () => {
  const firstAttachment: PersistableStateAttachmentTypeSetup = {
    id: 'attachment-1',
    migrations: {
      '8.4.0': (state) => {
        return { ...state, persistableStateAttachmentState: { one: 'one' } };
      },
    },
  };

  const secondAttachment: PersistableStateAttachmentTypeSetup = {
    id: 'attachment-2',
    migrations: {
      '8.3.0': (state) => {
        return { ...state, persistableStateAttachmentState: { two: 'two' } };
      },
    },
  };

  const migrationFunc: PersistableStateAttachmentTypeSetup = {
    id: 'attachment-3',
    // Migrations as function to test the logic of the getMigrateFunction
    migrations: () => ({
      '8.3.0': (state) => {
        return { ...state, persistableStateAttachmentState: { three: 'three' } };
      },
    }),
  };

  const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
  persistableStateAttachmentTypeRegistry.register(firstAttachment);
  persistableStateAttachmentTypeRegistry.register(secondAttachment);
  persistableStateAttachmentTypeRegistry.register(migrationFunc);

  it('construct the versions correctly', () => {
    const res = getAllPersistableAttachmentMigrations(persistableStateAttachmentTypeRegistry);
    expect(res).toMatchInlineSnapshot(`
      Object {
        "8.3.0": [Function],
        "8.4.0": [Function],
      }
    `);
  });

  it('should return the same state if the attachment is not registered', () => {
    const state = {
      persistableStateAttachmentTypeId: 'not-exists',
      persistableStateAttachmentState: { foo: 'foo' },
    };

    const res = getAllPersistableAttachmentMigrations(persistableStateAttachmentTypeRegistry);
    expect(res['8.3.0'](state)).toEqual(state);
    expect(res['8.4.0'](state)).toEqual(state);
  });

  /**
   * Only attachments with migration functions of 8.3
   * should run the migration function and migrate
   * the state
   */
  it.each([
    [
      'attachment with id attachment-1 does not run a 8.3 migration and leaves the state as is',
      {
        persistableStateAttachmentTypeId: 'attachment-1',
        persistableStateAttachmentState: { foo: 'foo' },
      },
      {
        persistableStateAttachmentTypeId: 'attachment-1',
        persistableStateAttachmentState: { foo: 'foo' },
      },
    ],
    [
      'attachment with id attachment-2 run a 8.3 migration and changes the state',
      {
        persistableStateAttachmentTypeId: 'attachment-2',
        persistableStateAttachmentState: { foo: 'foo' },
      },
      {
        persistableStateAttachmentTypeId: 'attachment-2',
        persistableStateAttachmentState: { two: 'two' },
      },
    ],
    [
      'attachment with id attachment-3 run a 8.3 migration and changes the state',
      {
        persistableStateAttachmentTypeId: 'attachment-3',
        persistableStateAttachmentState: { foo: 'foo' },
      },
      {
        persistableStateAttachmentTypeId: 'attachment-3',
        persistableStateAttachmentState: { three: 'three' },
      },
    ],
  ])('%s', (_, state, expectedState830) => {
    const res = getAllPersistableAttachmentMigrations(persistableStateAttachmentTypeRegistry);
    expect(res['8.3.0'](state)).toEqual(expectedState830);
  });

  /**
   * Only attachments with migration functions of 8.4
   * should run the migration function and migrate
   * the state
   */
  it.each([
    [
      'attachment with id attachment-1 run a 8.4 migration and changes the state',
      {
        persistableStateAttachmentTypeId: 'attachment-1',
        persistableStateAttachmentState: { foo: 'foo' },
      },
      {
        persistableStateAttachmentTypeId: 'attachment-1',
        persistableStateAttachmentState: { one: 'one' },
      },
    ],
    [
      'attachment with id attachment-2 does not run a 8.4 migration and leaves the state as is',
      {
        persistableStateAttachmentTypeId: 'attachment-2',
        persistableStateAttachmentState: { foo: 'foo' },
      },
      {
        persistableStateAttachmentTypeId: 'attachment-2',
        persistableStateAttachmentState: { foo: 'foo' },
      },
    ],
    [
      'attachment with id attachment-3 does not run a 8.4 migration and leaves the state as is',
      {
        persistableStateAttachmentTypeId: 'attachment-3',
        persistableStateAttachmentState: { foo: 'foo' },
      },
      {
        persistableStateAttachmentTypeId: 'attachment-3',
        persistableStateAttachmentState: { foo: 'foo' },
      },
    ],
  ])('%s', (_, state, expectedState830) => {
    const res = getAllPersistableAttachmentMigrations(persistableStateAttachmentTypeRegistry);
    expect(res['8.4.0'](state)).toEqual(expectedState830);
  });
});
