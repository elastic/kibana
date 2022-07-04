/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentType } from '../../common';
import {
  AttributesTypePersistableState,
  CommentRequestPersistableStateType,
} from '../../common/api';
import { PersistableStateAttachmentTypeRegistry } from './persistable_state_registry';
import { PersistableStateAttachmentTypeSetup, PersistableStateAttachmentState } from './types';

export const getPersistableAttachment = (): PersistableStateAttachmentTypeSetup => ({
  id: '.test',
  inject: (state, references) => ({
    ...state,
    persistableStateAttachmentState: {
      ...state.persistableStateAttachmentState,
      injectedId: 'testRef',
    },
  }),
  extract: (state) => ({
    state: {
      ...state,
      persistableStateAttachmentTypeId: '.test',
      persistableStateAttachmentState: { foo: 'foo' },
    },
    references: [{ id: 'testRef', name: 'myTestReference', type: 'test-so' }],
  }),
  migrations: () => ({
    '8.4.0': (state: PersistableStateAttachmentState): PersistableStateAttachmentState => ({
      persistableStateAttachmentTypeId: '.test',
      persistableStateAttachmentState: { migrated: true },
    }),
  }),
});

export const persistableStateAttachmentStateOnly: PersistableStateAttachmentState = {
  persistableStateAttachmentTypeId: '.test',
  persistableStateAttachmentState: { foo: 'foo', injectedId: 'testRef' },
};

export const persistableStateAttachment: CommentRequestPersistableStateType = {
  ...persistableStateAttachmentStateOnly,
  type: CommentType.persistableState,
  owner: 'securitySolutionFixture',
};

export const persistableStateAttachmentAttributes: AttributesTypePersistableState = {
  ...persistableStateAttachment,
  type: CommentType.persistableState,
  owner: 'securitySolutionFixture',
  created_at: '2019-11-25T22:32:30.608Z',
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  updated_at: null,
  updated_by: null,
  pushed_at: null,
  pushed_by: null,
};

export const getPersistableStateAttachmentTypeRegistry =
  (): PersistableStateAttachmentTypeRegistry => {
    const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
    persistableStateAttachmentTypeRegistry.register(getPersistableAttachment());

    return persistableStateAttachmentTypeRegistry;
  };
