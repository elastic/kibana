/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createPersistableStateAttachmentTypeRegistryMock } from '../../../attachment_framework/mocks';
import { AttachmentGetter } from './get';

describe('AttachmentService getter', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();
  const persistableStateAttachmentTypeRegistry = createPersistableStateAttachmentTypeRegistryMock();
  let attachmentGetter: AttachmentGetter;

  beforeEach(async () => {
    jest.clearAllMocks();
    attachmentGetter = new AttachmentGetter({
      log: mockLogger,
      persistableStateAttachmentTypeRegistry,
      unsecuredSavedObjectsClient,
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
