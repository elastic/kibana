/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { ConversationDataWriter } from './conversations_data_writer';
import {
  getCreateConversationSchemaMock,
  getUpdateConversationSchemaMock,
} from '../__mocks__/conversations_schema.mock';
import { AuthenticatedUser } from '@kbn/security-plugin-types-common';

describe('ConversationDataWriter', () => {
  const mockUser1 = {
    username: 'my_username',
    authentication_realm: {
      type: 'my_realm_type',
      name: 'my_realm_name',
    },
  } as AuthenticatedUser;
  describe('#bulk', () => {
    let writer: ConversationDataWriter;
    let esClientMock: ElasticsearchClient;
    let loggerMock: Logger;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
      loggerMock = loggingSystemMock.createLogger();
      writer = new ConversationDataWriter({
        esClient: esClientMock,
        logger: loggerMock,
        index: 'conversations-default',
        spaceId: 'default',
        user: { name: 'test' },
      });
    });

    it('converts a list of conversations to an appropriate list of operations', async () => {
      await writer.bulk({
        conversationsToCreate: [
          getCreateConversationSchemaMock(),
          getCreateConversationSchemaMock(),
        ],
        conversationsToUpdate: [],
        conversationsToDelete: [],
        authenticatedUser: mockUser1,
      });

      const { docs_created: docsCreated } = (esClientMock.bulk as jest.Mock).mock.lastCall;

      expect(docsCreated).toMatchInlineSnapshot(`undefined`);
    });

    it('converts a list of mixed conversations operations to an appropriate list of operations', async () => {
      (esClientMock.search as jest.Mock).mockResolvedValue({
        hits: { hits: [] },
      });
      await writer.bulk({
        conversationsToCreate: [getCreateConversationSchemaMock()],
        conversationsToUpdate: [getUpdateConversationSchemaMock()],
        conversationsToDelete: ['1'],
        authenticatedUser: mockUser1,
      });

      const {
        docs_created: docsCreated,
        docs_deleted: docsDeleted,
        docs_updated: docsUpdated,
      } = (esClientMock.bulk as jest.Mock).mock.lastCall;

      expect(docsCreated).toMatchInlineSnapshot(`undefined`);

      expect(docsUpdated).toMatchInlineSnapshot(`undefined`);

      expect(docsDeleted).toMatchInlineSnapshot(`undefined`);
    });

    it('returns an error if something went wrong', async () => {
      (esClientMock.search as jest.Mock).mockResolvedValue({
        hits: { hits: [] },
      });
      (esClientMock.bulk as jest.Mock).mockRejectedValue(new Error('something went wrong'));

      const { errors } = await writer.bulk({
        conversationsToCreate: [],
        conversationsToUpdate: [],
        conversationsToDelete: ['1'],
      });

      expect(errors).toEqual([
        {
          conversation: {
            id: '',
          },
          message: 'something went wrong',
        },
      ]);
    });

    it('returns the time it took to write the conversations', async () => {
      (esClientMock.search as jest.Mock).mockResolvedValue({
        hits: { hits: [] },
      });
      (esClientMock.bulk as jest.Mock).mockResolvedValue({
        took: 123,
        items: [],
      });

      const { took } = await writer.bulk({
        conversationsToCreate: [],
        conversationsToUpdate: [],
        conversationsToDelete: ['1'],
      });

      expect(took).toEqual(123);
    });

    it('returns the array of docs deleted', async () => {
      (esClientMock.search as jest.Mock).mockResolvedValue({
        hits: { hits: [] },
      });
      (esClientMock.bulk as jest.Mock).mockResolvedValue({
        items: [{ delete: { status: 201 } }, { delete: { status: 200 } }],
      });

      const { docs_deleted: docsDeleted } = await writer.bulk({
        conversationsToCreate: [],
        conversationsToUpdate: [],
        conversationsToDelete: ['1', '2'],
      });

      expect(docsDeleted.length).toEqual(2);
    });

    describe('when some documents failed to be written', () => {
      beforeEach(() => {
        (esClientMock.search as jest.Mock).mockResolvedValue({
          hits: { hits: [] },
        });
        (esClientMock.bulk as jest.Mock).mockResolvedValue({
          errors: true,
          items: [
            { create: { status: 201 } },
            { create: { status: 500, error: { reason: 'something went wrong' } } },
          ],
        });
      });

      it('returns the number of docs written', async () => {
        const { docs_created: docsCreated } = await writer.bulk({
          conversationsToCreate: [getCreateConversationSchemaMock()],
          conversationsToUpdate: [],
          conversationsToDelete: [],
          authenticatedUser: mockUser1,
        });

        expect(docsCreated.length).toEqual(1);
      });

      it('returns the errors', async () => {
        const { errors } = await writer.bulk({
          conversationsToCreate: [],
          conversationsToUpdate: [],
          conversationsToDelete: ['1'],
        });

        expect(errors).toEqual([
          {
            conversation: {
              id: undefined,
            },
            message: 'something went wrong',
            status: 500,
          },
        ]);
      });
    });

    describe('when there are no conversations to update', () => {
      it('returns an appropriate response', async () => {
        const response = await writer.bulk({});
        expect(response).toEqual({
          errors: [],
          docs_created: [],
          docs_deleted: [],
          docs_updated: [],
          took: 0,
        });
      });
    });
  });
});
