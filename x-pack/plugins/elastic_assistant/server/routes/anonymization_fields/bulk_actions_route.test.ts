/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getAnonymizationFieldsBulkActionRequest, requestMock } from '../../__mocks__/request';
import { ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION } from '@kbn/elastic-assistant-common';
import {
  getEmptyFindResult,
  getFindAnonymizationFieldsResultWithSingleHit,
} from '../../__mocks__/response';
import { AuthenticatedUser } from '@kbn/core-security-common';
import { bulkActionAnonymizationFieldsRoute } from './bulk_actions_route';
import {
  getAnonymizationFieldMock,
  getCreateAnonymizationFieldSchemaMock,
  getPerformBulkActionSchemaMock,
  getUpdateAnonymizationFieldSchemaMock,
} from '../../__mocks__/anonymization_fields_schema.mock';

describe('Perform bulk action route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const mockAnonymizationField = getAnonymizationFieldMock(getUpdateAnonymizationFieldSchemaMock());
  const mockUser1 = {
    profile_uid: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
    username: 'my_username',
    authentication_realm: {
      type: 'my_realm_type',
      name: 'my_realm_name',
    },
  } as AuthenticatedUser;

  beforeEach(async () => {
    server = serverMock.create();
    logger = loggingSystemMock.createLogger();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.findDocuments.mockResolvedValue(
      Promise.resolve(getFindAnonymizationFieldsResultWithSingleHit())
    );
    (
      (await clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.getWriter())
        .bulk as jest.Mock
    ).mockResolvedValue({
      docs_created: [mockAnonymizationField, mockAnonymizationField],
      docs_updated: [mockAnonymizationField, mockAnonymizationField],
      docs_deleted: [],
      errors: [],
    });
    context.elasticAssistant.getCurrentUser.mockReturnValue(mockUser1);
    bulkActionAnonymizationFieldsRoute(server.router, logger);
  });

  describe('status codes', () => {
    it('returns 200 when performing bulk action with all dependencies present', async () => {
      clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.findDocuments.mockResolvedValueOnce(
        Promise.resolve(getEmptyFindResult())
      );
      const response = await server.inject(
        getAnonymizationFieldsBulkActionRequest(
          [getCreateAnonymizationFieldSchemaMock()],
          [getUpdateAnonymizationFieldSchemaMock('49403909-ca9b-49ba-9d7a-7e5320e68d04')],
          ['99403909-ca9b-49ba-9d7a-7e5320e68d05']
        ),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        success: true,
        anonymization_fields_count: 3,
        attributes: {
          results: someBulkActionResults(),
          summary: {
            failed: 0,
            skipped: 0,
            succeeded: 3,
            total: 3,
          },
        },
      });
    });
  });

  describe('anonymization fields bulk actions failures', () => {
    it('returns partial failure error if update of few anonymization fields fail', async () => {
      (
        (await clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.getWriter())
          .bulk as jest.Mock
      ).mockResolvedValue({
        docs_created: [mockAnonymizationField],
        docs_updated: [],
        docs_deleted: [],
        errors: [
          {
            message: 'mocked validation message',
            document: { id: 'failed-anonymization-field-id-1', name: 'Detect Root/Admin Users' },
          },
          {
            message: 'mocked validation message',
            document: { id: 'failed-anonymization-field-id-2', name: 'Detect Root/Admin Users' },
          },
          {
            message: 'test failure',
            document: { id: 'failed-anonymization-field-id-3', name: 'Detect Root/Admin Users' },
          },
        ],
        total: 4,
      });
      clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient.findDocuments.mockResolvedValueOnce(
        Promise.resolve(getEmptyFindResult())
      );
      const response = await server.inject(
        getAnonymizationFieldsBulkActionRequest(
          [getCreateAnonymizationFieldSchemaMock()],
          [getUpdateAnonymizationFieldSchemaMock('49403909-ca9b-49ba-9d7a-7e5320e68d04')],
          ['99403909-ca9b-49ba-9d7a-7e5320e68d05']
        ),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        attributes: {
          summary: {
            failed: 3,
            succeeded: 1,
            skipped: 0,
            total: 4,
          },
          errors: [
            {
              message: 'mocked validation message',
              anonymization_fields: [
                {
                  id: 'failed-anonymization-field-id-1',
                  name: '',
                },
              ],
              status_code: 500,
            },
            {
              message: 'mocked validation message',
              anonymization_fields: [
                {
                  id: 'failed-anonymization-field-id-2',
                  name: '',
                },
              ],
              status_code: 500,
            },
            {
              message: 'test failure',
              anonymization_fields: [
                {
                  id: 'failed-anonymization-field-id-3',
                  name: '',
                },
              ],
              status_code: 500,
            },
          ],
          results: someBulkActionResults(),
        },
        message: 'Bulk edit partially failed',
      });
    });
  });

  describe('request validation', () => {
    it('rejects payloads with no ids in delete operation', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
        body: { ...getPerformBulkActionSchemaMock(), delete: { ids: [] } },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        'delete.ids: Array must contain at least 1 element(s)'
      );
    });

    it('accepts payloads with only delete action', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
        body: getPerformBulkActionSchemaMock(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    it('accepts payloads with all operations', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
        body: getPerformBulkActionSchemaMock(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    it('rejects payload if there is more than 100 deletes in payload', async () => {
      const request = requestMock.create({
        method: 'post',
        path: ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
        body: {
          ...getPerformBulkActionSchemaMock(),
          delete: { ids: Array.from({ length: 101 }).map(() => 'fake-id') },
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body.message).toEqual('More than 100 ids sent for bulk edit action.');
    });
  });
});

function someBulkActionResults() {
  return {
    created: expect.any(Array),
    deleted: expect.any(Array),
    updated: expect.any(Array),
    skipped: expect.any(Array),
  };
}
