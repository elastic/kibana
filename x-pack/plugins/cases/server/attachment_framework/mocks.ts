/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { CommentType, SECURITY_SOLUTION_OWNER } from '../../common';
import {
  AttributesTypeExternalReferenceNoSO,
  AttributesTypeExternalReferenceSO,
  AttributesTypePersistableState,
  CommentRequestPersistableStateType,
  ExternalReferenceStorageType,
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

export const externalReferenceAttachmentSO = {
  type: CommentType.externalReference as const,
  externalReferenceId: 'my-id',
  externalReferenceStorage: {
    type: ExternalReferenceStorageType.savedObject as const,
    soType: 'test-so',
  },
  externalReferenceAttachmentTypeId: '.test',
  externalReferenceMetadata: null,
  owner: SECURITY_SOLUTION_OWNER,
};

export const externalReferenceAttachmentES = {
  type: CommentType.externalReference as const,
  externalReferenceId: 'my-id',
  externalReferenceStorage: {
    type: ExternalReferenceStorageType.elasticSearchDoc as const,
  },
  externalReferenceAttachmentTypeId: '.test',
  externalReferenceMetadata: null,
  owner: SECURITY_SOLUTION_OWNER,
};

export const externalReferenceAttachmentSOAttributes: AttributesTypeExternalReferenceSO = {
  ...externalReferenceAttachmentSO,
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

export const externalReferenceAttachmentESAttributes: AttributesTypeExternalReferenceNoSO = {
  ...externalReferenceAttachmentES,
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

export const persistableStateAttachmentAttributesWithoutInjectedId = omit(
  persistableStateAttachmentAttributes,
  'persistableStateAttachmentState.injectedId'
);

export const externalReferenceAttachmentSOAttributesWithoutRefs = omit(
  externalReferenceAttachmentSOAttributes,
  'externalReferenceId'
);

export const getPersistableStateAttachmentTypeRegistry =
  (): PersistableStateAttachmentTypeRegistry => {
    const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
    persistableStateAttachmentTypeRegistry.register(getPersistableAttachment());

    return persistableStateAttachmentTypeRegistry;
  };
