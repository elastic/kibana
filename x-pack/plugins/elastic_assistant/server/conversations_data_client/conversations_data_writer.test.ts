/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { ConversationDataWriter } from './conversations_data_writer';

describe('ConversationDataWriter', () => {
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
        conversationsToCreate: [],
        conversationsToUpdate: [],
        conversationsToDelete: ['1'],
      });

      const [{ operations }] = (esClientMock.bulk as jest.Mock).mock.lastCall;

      expect(operations).toMatchInlineSnapshot(`
        Array [
          Object {
            "create": Object {
              "_index": "conversations-default",
            },
          },
          Object {
            "@timestamp": "2023-02-15T00:15:19.231Z",
          },
          Object {
            "create": Object {
              "_index": "conversations-default",
            },
          },
          Object {
            "@timestamp": "2023-02-15T00:15:19.231Z",
          },
        ]
      `);
    });

    it('converts a list of mixed conversations operations to an appropriate list of operations', async () => {
      await writer.bulk({
        conversationsToCreate: [],
        conversationsToUpdate: [],
        conversationsToDelete: ['1'],
      });

      const [{ operations }] = (esClientMock.bulk as jest.Mock).mock.lastCall;

      expect(operations).toMatchInlineSnapshot(`
        Array [
          Object {
            "create": Object {
              "_index": "conversations-default",
            },
          },
          Object {
            "@timestamp": "2023-02-15T00:15:19.231Z",
          },
          Object {
            "update": Object {
              "_index": "conversations-default",
            },
          },
          Object {
            "@timestamp": "2023-02-15T00:15:19.231Z",
          },
          Object {
            "delete": Object {
              "_index": "conversations-default",
            },
          },
          Object {
            "@timestamp": "2023-02-15T00:15:19.231Z",
          },
        ]
      `);
    });

    it('returns an error if something went wrong', async () => {
      (esClientMock.bulk as jest.Mock).mockRejectedValue(new Error('something went wrong'));

      const { errors } = await writer.bulk({
        conversationsToCreate: [],
        conversationsToUpdate: [],
        conversationsToDelete: ['1'],
      });

      expect(errors).toEqual(['something went wrong']);
    });

    it('returns the time it took to write the conversations', async () => {
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

    it('returns the number of docs written', async () => {
      (esClientMock.bulk as jest.Mock).mockResolvedValue({
        items: [{ create: { status: 201 } }, { create: { status: 200 } }],
      });

      const { docs_deleted: docsWritten } = await writer.bulk({
        conversationsToCreate: [],
        conversationsToUpdate: [],
        conversationsToDelete: ['1'],
      });

      expect(docsWritten).toEqual(2);
    });

    describe('when some documents failed to be written', () => {
      beforeEach(() => {
        (esClientMock.bulk as jest.Mock).mockResolvedValue({
          errors: true,
          items: [
            { create: { status: 201 } },
            { create: { status: 500, error: { reason: 'something went wrong' } } },
          ],
        });
      });

      it('returns the number of docs written', async () => {
        const { docs_created: docsWritten } = await writer.bulk({
          conversationsToCreate: [],
          conversationsToUpdate: [],
          conversationsToDelete: ['1'],
        });

        expect(docsWritten).toEqual(1);
      });

      it('returns the errors', async () => {
        const { errors } = await writer.bulk({
          conversationsToCreate: [],
          conversationsToUpdate: [],
          conversationsToDelete: ['1'],
        });

        expect(errors).toEqual(['something went wrong']);
      });
    });

    describe('when there are no conversations to write', () => {
      it('returns an appropriate response', async () => {
        const response = await writer.bulk({});
        expect(response).toEqual({ errors: [], docs_written: 0, took: 0 });
      });
    });
  });
});
