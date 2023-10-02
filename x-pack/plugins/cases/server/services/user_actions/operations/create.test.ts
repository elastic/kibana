/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_USER_ACTION_SAVED_OBJECT } from '../../../../common/constants';
import { PersistableStateAttachmentTypeRegistry } from '../../../attachment_framework/persistable_state_registry';
import { createSavedObjectsSerializerMock } from '../../../client/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { set, unset } from 'lodash';
import { createConnectorObject } from '../../test_utils';
import { UserActionPersister } from './create';
import { createUserActionSO } from '../test_utils';
import type { BulkCreateAttachmentUserAction, CreateUserActionClient } from '../types';
import type { UserActionPersistedAttributes } from '../../../common/types/user_actions';
import {
  getAssigneesAddedRemovedUserActions,
  getAssigneesAddedUserActions,
  getAssigneesRemovedUserActions,
  getBuiltUserActions,
  getTagsAddedRemovedUserActions,
  patchAddRemoveAssigneesCasesRequest,
  patchAssigneesCasesRequest,
  patchCasesRequest,
  patchRemoveAssigneesCasesRequest,
  patchTagsCasesRequest,
} from '../mocks';
import { AttachmentType } from '../../../../common/types/domain';

describe('UserActionPersister', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();
  const auditMockLocker = auditLoggerMock.create();
  const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
  const savedObjectsSerializer = createSavedObjectsSerializerMock();

  let persister: UserActionPersister;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-01-09T22:00:00.000Z'));
  });

  beforeEach(() => {
    jest.resetAllMocks();
    persister = new UserActionPersister({
      log: mockLogger,
      unsecuredSavedObjectsClient,
      persistableStateAttachmentTypeRegistry,
      savedObjectsSerializer,
      auditLogger: auditMockLocker,
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const getRequest = () =>
    ({
      action: 'update' as const,
      type: 'connector' as const,
      caseId: 'test',
      payload: { connector: createConnectorObject().connector },
      connectorId: '1',
      owner: 'cases',
      user: { email: '', full_name: '', username: '' },
    } as CreateUserActionClient<'connector'>);

  const getBulkCreateAttachmentRequest = (): BulkCreateAttachmentUserAction => ({
    caseId: 'test',
    attachments: [
      {
        id: '1',
        owner: 'cases',
        attachment: { comment: 'test', type: AttachmentType.user, owner: 'cases' },
      },
    ],
    user: { email: '', full_name: '', username: '' },
  });

  const testUser = { full_name: 'Elastic User', username: 'elastic', email: 'elastic@elastic.co' };

  describe('Decoding requests', () => {
    describe('createUserAction', () => {
      beforeEach(() => {
        unsecuredSavedObjectsClient.create.mockResolvedValue({
          attributes: createUserActionSO(),
          id: '1',
          type: CASE_USER_ACTION_SAVED_OBJECT,
          references: [],
        });
      });

      it('decodes correctly the requested attributes', async () => {
        await expect(persister.createUserAction(getRequest())).resolves.not.toThrow();
      });

      it('throws if fields is omitted', async () => {
        const req = getRequest();
        unset(req, 'payload.connector.fields');

        await expect(persister.createUserAction(req)).rejects.toThrow(
          'Invalid value "undefined" supplied to "payload,connector,fields"'
        );
      });

      it('strips out excess attributes', async () => {
        const req = getRequest();
        set(req, 'payload.foo', 'bar');

        await expect(persister.createUserAction(req)).resolves.not.toThrow();

        const persistedAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as UserActionPersistedAttributes;

        expect(persistedAttributes.payload).not.toHaveProperty('foo');
      });
    });

    describe('bulkCreateAttachmentCreation', () => {
      beforeEach(() => {
        unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
          saved_objects: [
            {
              attributes: createUserActionSO(),
              id: '1',
              type: CASE_USER_ACTION_SAVED_OBJECT,
              references: [],
            },
          ],
        });
      });

      it('decodes correctly the requested attributes', async () => {
        await expect(
          persister.bulkCreateAttachmentCreation(getBulkCreateAttachmentRequest())
        ).resolves.not.toThrow();
      });

      it('throws if owner is omitted', async () => {
        const req = getBulkCreateAttachmentRequest();
        unset(req, 'attachments[0].owner');

        await expect(persister.bulkCreateAttachmentCreation(req)).rejects.toThrow(
          'Invalid value "undefined" supplied to "owner"'
        );
      });

      it('strips out excess attributes', async () => {
        const req = getBulkCreateAttachmentRequest();
        set(req, 'attachments[0].attachment.foo', 'bar');

        await expect(persister.bulkCreateAttachmentCreation(req)).resolves.not.toThrow();

        const persistedAttributes = unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0][0]
          .attributes as UserActionPersistedAttributes;

        expect(persistedAttributes.payload).not.toHaveProperty('foo');
      });
    });
  });

  describe('buildUserActions', () => {
    it('creates the correct user actions when bulk updating cases', async () => {
      expect(
        persister.buildUserActions({
          updatedCases: patchCasesRequest,
          user: testUser,
        })
      ).toEqual(getBuiltUserActions({ isMock: false }));
    });

    it('creates the correct user actions when an assignee is added', async () => {
      expect(
        persister.buildUserActions({
          updatedCases: patchAssigneesCasesRequest,
          user: testUser,
        })
      ).toEqual(getAssigneesAddedUserActions({ isMock: false }));
    });

    it('creates the correct user actions when an assignee is removed', async () => {
      expect(
        persister.buildUserActions({
          updatedCases: patchRemoveAssigneesCasesRequest,
          user: testUser,
        })
      ).toEqual(getAssigneesRemovedUserActions({ isMock: false }));
    });

    it('creates the correct user actions when assignees are added and removed', async () => {
      expect(
        persister.buildUserActions({
          updatedCases: patchAddRemoveAssigneesCasesRequest,
          user: testUser,
        })
      ).toEqual(
        getAssigneesAddedRemovedUserActions({
          isMock: false,
        })
      );
    });

    it('creates the correct user actions when tags are added and removed', async () => {
      expect(
        persister.buildUserActions({
          updatedCases: patchTagsCasesRequest,
          user: testUser,
        })
      ).toEqual(
        getTagsAddedRemovedUserActions({
          isMock: false,
        })
      );
    });
  });
});
