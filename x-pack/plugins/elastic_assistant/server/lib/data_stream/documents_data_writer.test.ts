/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  getCreateConversationSchemaMock,
  getUpdateConversationSchemaMock,
} from '../../__mocks__/conversations_schema.mock';
import { authenticatedUser } from '../../__mocks__/user';
import { DocumentsDataWriter } from './documents_data_writer';

describe('DocumentsDataWriter', () => {
  const mockUser1 = authenticatedUser;
  describe('#bulk', () => {
    let writer: DocumentsDataWriter;
    let esClientMock: ElasticsearchClient;
    let loggerMock: Logger;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
      loggerMock = loggingSystemMock.createLogger();
      writer = new DocumentsDataWriter({
        esClient: esClientMock,
        logger: loggerMock,
        index: 'documents-default',
        spaceId: 'default',
        user: { name: 'test' },
      });
    });

    it('converts a list of documents to an appropriate list of operations', async () => {
      await writer.bulk({
        documentsToCreate: [getCreateConversationSchemaMock(), getCreateConversationSchemaMock()],
        documentsToUpdate: [],
        documentsToDelete: [],
        authenticatedUser: mockUser1,
        getUpdateScript: jest.fn(),
      });

      const { docs_created: docsCreated } = (esClientMock.bulk as jest.Mock).mock.lastCall;

      expect(docsCreated).toMatchInlineSnapshot(`undefined`);
    });

    it('converts a list of mixed documents operations to an appropriate list of operations', async () => {
      (esClientMock.search as jest.Mock).mockResolvedValue({
        hits: { hits: [] },
      });
      await writer.bulk({
        documentsToCreate: [getCreateConversationSchemaMock()],
        documentsToUpdate: [getUpdateConversationSchemaMock()],
        documentsToDelete: ['1'],
        authenticatedUser: mockUser1,
        getUpdateScript: jest.fn(),
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
        documentsToCreate: [],
        documentsToUpdate: [],
        documentsToDelete: ['1'],
        getUpdateScript: jest.fn(),
      });

      expect(errors).toEqual([
        {
          document: {
            id: '',
          },
          message: 'something went wrong',
        },
      ]);
    });

    it('returns the time it took to write the documents', async () => {
      (esClientMock.search as jest.Mock).mockResolvedValue({
        hits: { hits: [] },
      });
      (esClientMock.bulk as jest.Mock).mockResolvedValue({
        took: 123,
        items: [],
      });

      const { took } = await writer.bulk({
        documentsToCreate: [],
        documentsToUpdate: [],
        documentsToDelete: ['1'],
        getUpdateScript: jest.fn(),
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
        documentsToCreate: [],
        documentsToUpdate: [],
        documentsToDelete: ['1', '2'],
        getUpdateScript: jest.fn(),
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
          documentsToCreate: [getCreateConversationSchemaMock()],
          documentsToUpdate: [],
          documentsToDelete: [],
          authenticatedUser: mockUser1,
          getUpdateScript: jest.fn(),
        });

        expect(docsCreated.length).toEqual(1);
      });

      it('returns the errors', async () => {
        const { errors } = await writer.bulk({
          documentsToCreate: [],
          documentsToUpdate: [],
          documentsToDelete: ['1'],
          getUpdateScript: jest.fn(),
        });

        expect(errors).toEqual([
          {
            document: {
              id: undefined,
            },
            message: 'something went wrong',
            status: 500,
          },
        ]);
      });
    });

    describe('when there are no documents to update', () => {
      it('returns an appropriate response', async () => {
        const response = await writer.bulk({
          getUpdateScript: jest.fn(),
        });
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
