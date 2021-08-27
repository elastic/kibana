/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import supertest from 'supertest';
import { createApmEventClient } from '.';
import { contextServiceMock } from '../../../../../../../../src/core/server/context/context_service.mock';
import { executionContextServiceMock } from '../../../../../../../../src/core/server/execution_context/execution_context_service.mock';
import { createHttpServer } from '../../../../../../../../src/core/server/http/test_utils';

describe('createApmEventClient', () => {
  let server: ReturnType<typeof createHttpServer>;

  beforeEach(() => {
    server = createHttpServer();
  });

  afterEach(async () => {
    await server.stop();
  });
  it('cancels a search when a request is aborted', async () => {
    await server.preboot({
      context: contextServiceMock.createPrebootContract(),
    });
    const { server: innerServer, createRouter } = await server.setup({
      context: contextServiceMock.createSetupContract(),
      executionContext: executionContextServiceMock.createInternalSetupContract(),
    });
    const router = createRouter('/');

    const abort = jest.fn();
    router.get(
      { path: '/', validate: false },
      async (context, request, res) => {
        const eventClient = createApmEventClient({
          esClient: {
            search: () => {
              return Object.assign(
                new Promise((resolve) => setTimeout(resolve, 3000)),
                { abort }
              );
            },
          } as any,
          debug: false,
          request,
          indices: {} as any,
          options: {
            includeFrozen: false,
          },
        });

        await eventClient.search('foo', {
          apm: {
            events: [],
          },
        });

        return res.ok({ body: 'ok' });
      }
    );

    await server.start();

    const incomingRequest = supertest(innerServer.listener)
      .get('/')
      // end required to send request
      .end();

    await new Promise((resolve) => {
      setTimeout(() => {
        incomingRequest.on('abort', () => {
          setTimeout(() => {
            resolve(undefined);
          }, 100);
        });
        incomingRequest.abort();
      }, 100);
    });

    expect(abort).toHaveBeenCalled();
  });
});
