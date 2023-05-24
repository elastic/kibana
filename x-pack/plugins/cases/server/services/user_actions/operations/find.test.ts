/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PersistableStateAttachmentTypeRegistry } from '../../../attachment_framework/persistable_state_registry';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { UserActionFinder } from './find';
import { createSavedObjectsSerializerMock } from '../../../client/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import {
  createConnectorUserAction,
  createUserActionFindSO,
  createUserActionSO,
} from '../test_utils';
import { createSOFindResponse } from '../../test_utils';
import { omit } from 'lodash';
import type { SavedObjectsFindResponse } from '@kbn/core/server';

describe('UserActionsService: Finder', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();
  const auditMockLocker = auditLoggerMock.create();
  const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
  const savedObjectsSerializer = createSavedObjectsSerializerMock();

  const attributesToValidateIfMissing = ['created_at', 'created_by', 'owner', 'action', 'payload'];

  let finder: UserActionFinder;

  beforeEach(() => {
    jest.resetAllMocks();
    finder = new UserActionFinder({
      log: mockLogger,
      unsecuredSavedObjectsClient,
      persistableStateAttachmentTypeRegistry,
      savedObjectsSerializer,
      auditLogger: auditMockLocker,
    });
  });

  const mockFind = (soFindRes: SavedObjectsFindResponse) => {
    unsecuredSavedObjectsClient.find.mockResolvedValue(soFindRes);
  };

  const mockPointInTimeFinder = (soFindRes: SavedObjectsFindResponse) => {
    unsecuredSavedObjectsClient.createPointInTimeFinder.mockReturnValue({
      close: jest.fn(),
      // @ts-expect-error
      find: function* asyncGenerator() {
        yield {
          ...soFindRes,
        };
      },
    });
  };

  const decodingTests: Array<
    [keyof UserActionFinder, (soFindRes: SavedObjectsFindResponse) => void]
  > = [
    ['find', mockFind],
    ['findStatusChanges', mockPointInTimeFinder],
  ];

  describe('find', () => {
    it('sets the comment_id to null if it is omitted', async () => {
      const userAction = createUserActionSO();
      const attributes = omit({ ...userAction.attributes }, 'comment_id');
      const soFindRes = createSOFindResponse([{ ...userAction, attributes, score: 0 }]);
      mockFind(soFindRes);

      const res = await finder.find({ caseId: '1' });
      const commentId = res.saved_objects[0].attributes.comment_id;

      expect(commentId).toBe(null);
    });
  });

  describe('findStatusChanges', () => {
    it('sets the comment_id to null if it is omitted', async () => {
      const userAction = createUserActionSO();
      const attributes = omit({ ...userAction.attributes }, 'comment_id');
      const soFindRes = createSOFindResponse([{ ...userAction, attributes, score: 0 }]);
      mockPointInTimeFinder(soFindRes);

      const res = await finder.findStatusChanges({ caseId: '1' });
      const commentId = res[0].attributes.comment_id;

      expect(commentId).toBe(null);
    });
  });

  describe.each(decodingTests)('Decoding: %s', (soMethodName, method) => {
    it('decodes correctly', async () => {
      const userAction = createUserActionSO();
      const soFindRes = createSOFindResponse([createUserActionFindSO(userAction)]);
      method(soFindRes);

      await expect(finder[soMethodName]({ caseId: '1' })).resolves.not.toThrow();
    });

    it.each(attributesToValidateIfMissing)('throws if %s is omitted', async (key) => {
      const userAction = createUserActionSO();
      const attributes = omit({ ...userAction.attributes }, key);
      const soFindRes = createSOFindResponse([{ ...userAction, attributes, score: 0 }]);
      method(soFindRes);

      await expect(finder[soMethodName]({ caseId: '1' })).rejects.toThrow(
        `Invalid value "undefined" supplied to "${key}"`
      );
    });

    it('throws if type is omitted', async () => {
      const userAction = createUserActionSO();
      const attributes = omit({ ...userAction.attributes }, 'type');
      const soFindRes = createSOFindResponse([{ ...userAction, attributes, score: 0 }]);
      method(soFindRes);

      await expect(finder[soMethodName]({ caseId: '1' })).rejects.toThrow();
    });

    it('throws if missing attributes from the payload', async () => {
      const userAction = createUserActionSO();
      const attributes = omit({ ...userAction.attributes }, 'payload.title');
      const soFindRes = createSOFindResponse([{ ...userAction, attributes, score: 0 }]);
      method(soFindRes);

      await expect(finder[soMethodName]({ caseId: '1' })).rejects.toThrow(
        'Invalid value "undefined" supplied to "payload,title"'
      );
    });

    it('throws if missing nested attributes from the payload', async () => {
      const userAction = createConnectorUserAction();
      const attributes = omit({ ...userAction.attributes }, 'payload.connector.fields.issueType');
      const soFindRes = createSOFindResponse([{ ...userAction, attributes, score: 0 }]);
      method(soFindRes);

      await expect(finder[soMethodName]({ caseId: '1' })).rejects.toThrow(
        'Invalid value "undefined" supplied to "payload,connector,fields,issueType",Invalid value "{"priority":"high","parent":"2"}" supplied to "payload,connector,fields"'
      );
    });

    // TODO: Unskip when all types are converted to strict
    it.skip('strips out excess attributes', async () => {
      const userAction = createUserActionSO();
      const attributes = { ...userAction.attributes, 'not-exists': 'not-exists' };
      const soFindRes = createSOFindResponse([{ ...userAction, attributes, score: 0 }]);
      method(soFindRes);

      await expect(finder[soMethodName]({ caseId: '1' })).resolves.toEqual({
        attributes: userAction.attributes,
      });
    });
  });
});
