/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentType, SECURITY_SOLUTION_OWNER } from '../../common';
import {
  createPersistableStateAttachmentTypeRegistryMock,
  persistableStateAttachment,
  persistableStateAttachmentAttributes,
} from './mocks';
import {
  extractPersistableStateReferences,
  extractPersistableStateReferencesFromSO,
  injectPersistableReferences,
  injectPersistableReferencesToSO,
} from './so_references';

describe('Persistable state SO references', () => {
  const persistableStateAttachmentTypeRegistry = createPersistableStateAttachmentTypeRegistryMock();
  const references = [
    {
      id: 'testRef',
      name: 'myTestReference',
      type: 'test-so',
    },
  ];

  describe('extractPersistableStateReferences', () => {
    it('extracts references from a persistable state attachment correctly', async () => {
      const res = extractPersistableStateReferences(persistableStateAttachment, {
        persistableStateAttachmentTypeRegistry,
      });

      expect(res).toEqual({
        references,
        state: {
          owner: 'securitySolutionFixture',
          persistableStateAttachmentState: {
            foo: 'foo',
          },
          persistableStateAttachmentTypeId: '.test',
          type: 'persistableState',
        },
      });
    });

    it('returns the same state if the attachment is not register in the registry', async () => {
      const res = extractPersistableStateReferences(
        { ...persistableStateAttachment, persistableStateAttachmentTypeId: 'not-exists' },
        {
          persistableStateAttachmentTypeRegistry,
        }
      );

      expect(res).toEqual({
        references: [],
        state: {
          owner: 'securitySolutionFixture',
          persistableStateAttachmentState: {
            foo: 'foo',
            injectedId: 'testRef',
          },
          persistableStateAttachmentTypeId: 'not-exists',
          type: 'persistableState',
        },
      });
    });
  });

  describe('injectPersistableReferences', () => {
    it('inject references to a persistable state attachment correctly', async () => {
      const res = injectPersistableReferences(
        { state: persistableStateAttachment, references },
        {
          persistableStateAttachmentTypeRegistry,
        }
      );

      expect(res).toEqual({
        owner: 'securitySolutionFixture',
        persistableStateAttachmentState: {
          foo: 'foo',
          injectedId: 'testRef',
        },
        persistableStateAttachmentTypeId: '.test',
        type: 'persistableState',
      });
    });

    it('returns the same state if the attachment is not registered in the registry', async () => {
      const res = injectPersistableReferences(
        {
          state: {
            ...persistableStateAttachment,
            persistableStateAttachmentState: { foo: 'foo' },
            persistableStateAttachmentTypeId: 'not-exists',
          },
          references,
        },
        {
          persistableStateAttachmentTypeRegistry,
        }
      );

      expect(res).toEqual({
        owner: 'securitySolutionFixture',
        persistableStateAttachmentState: {
          foo: 'foo',
        },
        persistableStateAttachmentTypeId: 'not-exists',
        type: 'persistableState',
      });
    });
  });

  describe('extractPersistableStateReferencesFromSO', () => {
    it('extracts references from a persistable state attachment correctly', async () => {
      const res = extractPersistableStateReferencesFromSO(persistableStateAttachmentAttributes, {
        persistableStateAttachmentTypeRegistry,
      });

      expect(res).toEqual({
        references: [
          {
            id: 'testRef',
            name: 'myTestReference',
            type: 'test-so',
          },
        ],
        attributes: {
          ...persistableStateAttachmentAttributes,
          persistableStateAttachmentState: {
            foo: 'foo',
          },
        },
      });
    });

    it('does not extract references for other attachments', async () => {
      const comment = {
        comment: 'a comment',
        type: CommentType.user as const,
        owner: SECURITY_SOLUTION_OWNER,
      };

      const res = extractPersistableStateReferencesFromSO(comment, {
        persistableStateAttachmentTypeRegistry,
      });

      expect(res).toEqual({
        references: [],
        attributes: comment,
      });
    });
  });

  describe('injectPersistableReferencesToSO', () => {
    it('injects references to a persistable state attachment correctly', async () => {
      const res = injectPersistableReferencesToSO(
        persistableStateAttachmentAttributes,
        references,
        {
          persistableStateAttachmentTypeRegistry,
        }
      );

      expect(res).toEqual({
        ...persistableStateAttachmentAttributes,
        persistableStateAttachmentState: {
          foo: 'foo',
          injectedId: 'testRef',
        },
      });
    });

    it('does not inject references for other attachments', async () => {
      const comment = {
        comment: 'a comment',
        type: CommentType.user as const,
        owner: SECURITY_SOLUTION_OWNER,
      };

      const res = injectPersistableReferencesToSO(comment, references, {
        persistableStateAttachmentTypeRegistry,
      });

      expect(res).toEqual(comment);
    });
  });
});
