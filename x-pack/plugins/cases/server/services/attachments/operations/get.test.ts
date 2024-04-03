/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unset } from 'lodash';

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { SavedObjectsFindResponse } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { createPersistableStateAttachmentTypeRegistryMock } from '../../../attachment_framework/mocks';
import { AttachmentGetter } from './get';
import { createAlertAttachment, createFileAttachment, createUserAttachment } from '../test_utils';
import { mockPointInTimeFinder, createSOFindResponse, createErrorSO } from '../../test_utils';
import { CASE_COMMENT_SAVED_OBJECT } from '../../../../common';

describe('AttachmentService getter', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();
  const persistableStateAttachmentTypeRegistry = createPersistableStateAttachmentTypeRegistryMock();

  const mockFinder = (soFindRes: SavedObjectsFindResponse) =>
    mockPointInTimeFinder(unsecuredSavedObjectsClient)(soFindRes);
  let attachmentGetter: AttachmentGetter;

  beforeEach(async () => {
    jest.clearAllMocks();
    attachmentGetter = new AttachmentGetter({
      log: mockLogger,
      persistableStateAttachmentTypeRegistry,
      unsecuredSavedObjectsClient,
    });
  });

  describe('bulkGet', () => {
    describe('Decoding', () => {
      it('does not throw when the response has the required fields', async () => {
        unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
          saved_objects: [createUserAttachment()],
        });

        await expect(attachmentGetter.bulkGet(['1'])).resolves.not.toThrow();
      });

      it('does not modified the error saved objects', async () => {
        unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
          // @ts-expect-error: SO client types are not correct
          saved_objects: [createUserAttachment(), createErrorSO(CASE_COMMENT_SAVED_OBJECT)],
        });

        const res = await attachmentGetter.bulkGet(['1', '2']);

        expect(res).toStrictEqual({
          saved_objects: [createUserAttachment(), createErrorSO(CASE_COMMENT_SAVED_OBJECT)],
        });
      });

      it('strips excess fields', async () => {
        unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
          saved_objects: [{ ...createUserAttachment({ foo: 'bar' }) }],
        });

        const res = await attachmentGetter.bulkGet(['1']);
        expect(res).toStrictEqual({ saved_objects: [createUserAttachment()] });
      });

      it('throws when the response is missing the attributes.comment field', async () => {
        const invalidAttachment = createUserAttachment();
        unset(invalidAttachment, 'attributes.comment');

        unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
          saved_objects: [invalidAttachment],
        });

        await expect(attachmentGetter.bulkGet(['1'])).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid value \\"undefined\\" supplied to \\"comment\\",Invalid value \\"user\\" supplied to \\"type\\",Invalid value \\"undefined\\" supplied to \\"alertId\\",Invalid value \\"undefined\\" supplied to \\"index\\",Invalid value \\"undefined\\" supplied to \\"rule\\",Invalid value \\"undefined\\" supplied to \\"actions\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceMetadata\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceStorage\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentState\\""`
        );
      });
    });
  });

  describe('getAllAlertsAttachToCase', () => {
    describe('Decoding', () => {
      it('does not throw when the response has the required fields', async () => {
        const soFindRes = createSOFindResponse([{ ...createAlertAttachment(), score: 0 }]);

        mockFinder(soFindRes);

        await expect(
          attachmentGetter.getAllAlertsAttachToCase({ caseId: '1' })
        ).resolves.not.toThrow();
      });

      it('strips excess fields', async () => {
        const soFindRes = createSOFindResponse([
          { ...createAlertAttachment({ foo: 'bar' }), score: 0 },
        ]);

        mockFinder(soFindRes);

        const res = await attachmentGetter.getAllAlertsAttachToCase({ caseId: '1' });
        expect(res).toStrictEqual([{ ...createAlertAttachment(), score: 0 }]);
      });

      it('throws when the response is missing the attributes.alertId field', async () => {
        const invalidAlert = { ...createAlertAttachment(), score: 0 };
        unset(invalidAlert, 'attributes.alertId');
        const soFindRes = createSOFindResponse([invalidAlert]);

        mockFinder(soFindRes);

        await expect(
          attachmentGetter.getAllAlertsAttachToCase({ caseId: '1' })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid value \\"undefined\\" supplied to \\"alertId\\""`
        );
      });
    });
  });

  describe('get', () => {
    describe('Decoding', () => {
      it('does not throw when the response has the required fields', async () => {
        unsecuredSavedObjectsClient.get.mockResolvedValue(createUserAttachment());

        await expect(attachmentGetter.get({ attachmentId: '1' })).resolves.not.toThrow();
      });

      it('strips excess fields', async () => {
        unsecuredSavedObjectsClient.get.mockResolvedValue({
          ...createUserAttachment({ foo: 'bar' }),
        });

        const res = await attachmentGetter.get({ attachmentId: '1' });
        expect(res).toStrictEqual(createUserAttachment());
      });

      it('throws when the response is missing the attributes.comment field', async () => {
        const invalidAttachment = createUserAttachment();
        unset(invalidAttachment, 'attributes.comment');

        unsecuredSavedObjectsClient.get.mockResolvedValue(invalidAttachment);

        await expect(
          attachmentGetter.get({ attachmentId: '1' })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid value \\"undefined\\" supplied to \\"comment\\",Invalid value \\"user\\" supplied to \\"type\\",Invalid value \\"undefined\\" supplied to \\"alertId\\",Invalid value \\"undefined\\" supplied to \\"index\\",Invalid value \\"undefined\\" supplied to \\"rule\\",Invalid value \\"undefined\\" supplied to \\"actions\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceMetadata\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceStorage\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentState\\""`
        );
      });
    });
  });

  describe('getFileAttachments', () => {
    describe('Decoding', () => {
      it('does not throw when the response has the required fields', async () => {
        const soFindRes = createSOFindResponse([{ ...createFileAttachment(), score: 0 }]);

        mockFinder(soFindRes);

        await expect(
          attachmentGetter.getFileAttachments({ caseId: '1', fileIds: ['1'] })
        ).resolves.not.toThrow();
      });

      it('strips excess fields', async () => {
        const soFindRes = createSOFindResponse([
          { ...createFileAttachment({ foo: 'bar' }), score: 0 },
        ]);

        mockFinder(soFindRes);

        const res = await attachmentGetter.getFileAttachments({ caseId: 'caseId', fileIds: ['1'] });

        expect(res).toStrictEqual([
          { ...createFileAttachment({ externalReferenceId: 'my-id' }), score: 0 },
        ]);
      });

      it('throws when the response is missing the attributes.externalReferenceAttachmentTypeId field', async () => {
        const invalidFile = { ...createFileAttachment(), score: 0 };
        unset(invalidFile, 'attributes.externalReferenceAttachmentTypeId');
        const soFindRes = createSOFindResponse([invalidFile]);

        mockFinder(soFindRes);

        await expect(
          attachmentGetter.getFileAttachments({ caseId: '1', fileIds: ['1'] })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid value \\"undefined\\" supplied to \\"comment\\",Invalid value \\"externalReference\\" supplied to \\"type\\",Invalid value \\"undefined\\" supplied to \\"alertId\\",Invalid value \\"undefined\\" supplied to \\"index\\",Invalid value \\"undefined\\" supplied to \\"rule\\",Invalid value \\"undefined\\" supplied to \\"actions\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceAttachmentTypeId\\",Invalid value \\"savedObject\\" supplied to \\"externalReferenceStorage,type\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentState\\""`
        );
      });
    });
  });

  describe('getAllAlertIds', () => {
    const aggsRes = {
      aggregations: { alertIds: { buckets: [{ key: 'alert-id-1' }, { key: 'alert-id-2' }] } },
      saved_objects: [],
      page: 1,
      per_page: 0,
      total: 0,
    };

    unsecuredSavedObjectsClient.find.mockResolvedValue(aggsRes);

    const caseId = 'test-case';

    it('returns the alert ids correctly', async () => {
      const res = await attachmentGetter.getAllAlertIds({ caseId });
      expect(Array.from(res.values())).toEqual(['alert-id-1', 'alert-id-2']);
    });

    it('calls find with correct arguments', async () => {
      await attachmentGetter.getAllAlertIds({ caseId });
      expect(unsecuredSavedObjectsClient.find.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "aggs": Object {
                "alertIds": Object {
                  "terms": Object {
                    "field": "cases-comments.attributes.alertId",
                    "size": 1000,
                  },
                },
              },
              "filter": Object {
                "arguments": Array [
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "cases-comments.attributes.type",
                  },
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "alert",
                  },
                ],
                "function": "is",
                "type": "function",
              },
              "hasReference": Object {
                "id": "test-case",
                "type": "cases",
              },
              "perPage": 0,
              "sortField": "created_at",
              "sortOrder": "asc",
              "type": "cases-comments",
            },
          ],
        ]
      `);
    });

    it('returns an empty set when there is no response', async () => {
      // @ts-expect-error
      unsecuredSavedObjectsClient.find.mockResolvedValue({});

      const res = await attachmentGetter.getAllAlertIds({ caseId });
      expect(Array.from(res.values())).toEqual([]);
    });

    it('remove duplicate keys', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        ...aggsRes,
        aggregations: { alertIds: { buckets: [{ key: 'alert-id-1' }, { key: 'alert-id-1' }] } },
      });

      const res = await attachmentGetter.getAllAlertIds({ caseId });
      expect(Array.from(res.values())).toEqual(['alert-id-1']);
    });
  });
});
