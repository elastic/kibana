/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFinalizeSignalsMigrationRequest } from '../__mocks__/request_responses';
import { requestContextMock, serverMock } from '../__mocks__';
import { finalizeSignalsMigrationRoute } from './finalize_signals_migration_route';

describe('finalizing signals migrations', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    // @ts-expect-error mocking the bare minimum of the response
    // get our completed task
    clients.newClusterClient.asCurrentUser.tasks.get.mockResolvedValueOnce({
      body: {
        completed: true,
        response: {},
        // satisfies our "is this the right task" validation
        task: { description: 'reindexing from sourceIndex to destinationIndex' },
      },
    });

    // @ts-expect-error mocking the bare minimum of the response
    // count of original index
    clients.newClusterClient.asCurrentUser.count.mockResolvedValueOnce({ body: { count: 1 } });
    // @ts-expect-error mocking the bare minimum of the response
    // count of migrated index
    clients.newClusterClient.asCurrentUser.count.mockResolvedValueOnce({ body: { count: 2 } });

    finalizeSignalsMigrationRoute(server.router);
  });

  test('returns an error if migration index size does not match the original index', async () => {
    const response = await server.inject(getFinalizeSignalsMigrationRequest(), context);
    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message:
        'The source and destination indexes have different document counts. Source [sourceIndex] has [1] documents, while destination [destinationIndex] has [2] documents.',
      status_code: 500,
    });
  });
});
