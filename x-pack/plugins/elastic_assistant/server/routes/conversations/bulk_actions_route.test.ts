/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { bulkActionConversationsRoute } from './bulk_actions_route';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getConversationsBulkActionRequest, requestMock } from '../../__mocks__/request';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION } from '@kbn/elastic-assistant-common';
import {
  getEmptyFindResult,
  getFindConversationsResultWithSingleHit,
} from '../../__mocks__/response';
import { getPerformBulkActionSchemaMock } from '../../__mocks__/conversations_schema.mock';

describe('Perform bulk action route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const mockConversation = getFindConversationsResultWithSingleHit().data[0];

  beforeEach(() => {
    server = serverMock.create();
    logger = loggingSystemMock.createLogger();
    ({ clients, context } = requestContextMock.createTools());

    clients.elasticAssistant.getAIAssistantConversationsDataClient.findConversations.mockResolvedValue(
      getFindConversationsResultWithSingleHit()
    );
    bulkActionConversationsRoute(server.router, logger);
  });

  describe('status codes', () => {
    it('returns 200 when performing bulk action with all dependencies present', async () => {
      const response = await server.inject(
        getConversationsBulkActionRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        success: true,
        rules_count: 1,
        attributes: {
          results: someBulkActionResults(),
          summary: {
            failed: 0,
            skipped: 0,
            succeeded: 1,
            total: 1,
          },
        },
      });
    });

    it("returns 200 when provided filter query doesn't match any conversations", async () => {
      clients.elasticAssistant.getAIAssistantConversationsDataClient.findConversations.mockResolvedValue(
        getEmptyFindResult()
      );
      const response = await server.inject(
        getConversationsBulkActionRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        success: true,
        rules_count: 0,
        attributes: {
          results: someBulkActionResults(),
          summary: {
            failed: 0,
            skipped: 0,
            succeeded: 0,
            total: 0,
          },
        },
      });
    });
  });

  describe('rules execution failures', () => {
    it('returns partial failure error if update of few rules fail', async () => {
      (
        (await clients.elasticAssistant.getAIAssistantConversationsDataClient.getWriter())
          .bulk as jest.Mock
      ).mockResolvedValue({
        rules: [mockConversation, mockConversation],
        skipped: [],
        errors: [
          {
            message: 'mocked validation message',
            conversation: { id: 'failed-conversation-id-1', name: 'Detect Root/Admin Users' },
          },
          {
            message: 'mocked validation message',
            conversation: { id: 'failed-conversation-id-2', name: 'Detect Root/Admin Users' },
          },
          {
            message: 'test failure',
            conversation: { id: 'failed-conversation-id-3', name: 'Detect Root/Admin Users' },
          },
        ],
        total: 5,
      });

      const response = await server.inject(
        getConversationsBulkActionRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        attributes: {
          summary: {
            failed: 3,
            succeeded: 2,
            skipped: 0,
            total: 5,
          },
          errors: [
            {
              message: 'mocked validation message',
              conversations: [
                {
                  id: 'failed-rule-id-1',
                  name: 'Detect Root/Admin Users',
                },
                {
                  id: 'failed-rule-id-2',
                  name: 'Detect Root/Admin Users',
                },
              ],
              status_code: 500,
            },
            {
              message: 'test failure',
              rules: [
                {
                  id: 'failed-rule-id-3',
                  name: 'Detect Root/Admin Users',
                },
              ],
              status_code: 500,
            },
          ],
          results: someBulkActionResults(),
        },
        message: 'Bulk edit partially failed',
        status_code: 500,
      });
    });
  });

  describe('conversation skipping', () => {
    it('returns partial failure error with skipped rules if some rule updates fail and others are skipped', async () => {
      (
        (await clients.elasticAssistant.getAIAssistantConversationsDataClient.getWriter())
          .bulk as jest.Mock
      ).mockResolvedValue({
        rules: [mockConversation, mockConversation],
        skipped: [
          { id: 'skipped-rule-id-1', name: 'Skipped Rule 1', skip_reason: 'RULE_NOT_MODIFIED' },
          { id: 'skipped-rule-id-2', name: 'Skipped Rule 2', skip_reason: 'RULE_NOT_MODIFIED' },
        ],
        errors: [
          {
            message: 'test failure',
            rule: { id: 'failed-rule-id-3', name: 'Detect Root/Admin Users' },
          },
        ],
        total: 5,
      });

      const response = await server.inject(
        getConversationsBulkActionRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        attributes: {
          summary: {
            failed: 1,
            skipped: 2,
            succeeded: 2,
            total: 5,
          },
          errors: [
            {
              message: 'test failure',
              rules: [
                {
                  id: 'failed-rule-id-3',
                  name: 'Detect Root/Admin Users',
                },
              ],
              status_code: 500,
            },
          ],
          results: someBulkActionResults(),
        },
        message: 'Bulk edit partially failed',
        status_code: 500,
      });
    });

    it('returns success with skipped rules if some rules are skipped, but no errors are reported', async () => {
      (
        (await clients.elasticAssistant.getAIAssistantConversationsDataClient.getWriter())
          .bulk as jest.Mock
      ).mockResolvedValue({
        rules: [mockConversation, mockConversation],
        skipped: [
          { id: 'skipped-rule-id-1', name: 'Skipped Rule 1', skip_reason: 'RULE_NOT_MODIFIED' },
          { id: 'skipped-rule-id-2', name: 'Skipped Rule 2', skip_reason: 'RULE_NOT_MODIFIED' },
        ],
        errors: [],
        total: 4,
      });

      const response = await server.inject(
        getConversationsBulkActionRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        attributes: {
          summary: {
            failed: 0,
            skipped: 2,
            succeeded: 2,
            total: 4,
          },
          results: someBulkActionResults(),
        },
        rules_count: 4,
        success: true,
      });
    });

    it('returns 500 with skipped rules if some rules are skipped, but some errors are reported', async () => {
      (
        (await clients.elasticAssistant.getAIAssistantConversationsDataClient.getWriter())
          .bulk as jest.Mock
      ).mockResolvedValue({
        rules: [mockConversation, mockConversation],
        skipped: [
          { id: 'skipped-rule-id-1', name: 'Skipped Rule 1', skip_reason: 'RULE_NOT_MODIFIED' },
          { id: 'skipped-rule-id-2', name: 'Skipped Rule 2', skip_reason: 'RULE_NOT_MODIFIED' },
        ],
        errors: [
          {
            message: 'test failure',
            rule: { id: 'failed-rule-id-3', name: 'Detect Root/Admin Users' },
          },
        ],
        total: 5,
      });

      const response = await server.inject(
        getConversationsBulkActionRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        attributes: {
          summary: {
            failed: 1,
            skipped: 2,
            succeeded: 2,
            total: 5,
          },
          results: someBulkActionResults(),
          errors: [
            {
              message: 'test failure',
              rules: [{ id: 'failed-rule-id-3', name: 'Detect Root/Admin Users' }],
              status_code: 500,
            },
          ],
        },
        message: 'Bulk edit partially failed',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    it('rejects payloads with no operations', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
        body: { ...getPerformBulkActionSchemaMock(), action: undefined },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        'action: Invalid literal value, expected "delete", action: Invalid literal value, expected "disable", action: Invalid literal value, expected "enable", action: Invalid literal value, expected "export", action: Invalid literal value, expected "duplicate", and 2 more'
      );
    });

    it('accepts payloads with only delete action', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
        body: getPerformBulkActionSchemaMock(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    it('accepts payloads with all operations', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
        body: getPerformBulkActionSchemaMock(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    it('rejects payload if there is more than 100 updates in payload', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
        body: {
          ...getPerformBulkActionSchemaMock(),
          ids: Array.from({ length: 101 }).map(() => 'fake-id'),
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body.message).toEqual('More than 100 operations sent for bulk edit action.');
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
