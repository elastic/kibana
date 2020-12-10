/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { requestContextMock, requestMock, serverMock } from '../__mocks__';
import { createSignalsMigrationRoute } from './create_signals_migration_route';
import {
  getIndexMappingsResponseMock,
  getMigrationStatusSearchResponseMock,
} from '../../migrations/get_migration_status.mock';
import { SignalsReindexOptions } from '../../../../../common/detection_engine/schemas/request/create_signals_migration_schema';
import { DETECTION_ENGINE_SIGNALS_MIGRATION_URL } from '../../../../../common/constants';
import { getCreateSignalsMigrationSchemaMock } from '../../../../../common/detection_engine/schemas/request/create_signals_migration_schema.mock';

describe('query for signal', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    // @ts-expect-error mocking the bare minimum of our queries
    // get our migration status
    clients.newClusterClient.asCurrentUser.search.mockResolvedValueOnce({
      body: getMigrationStatusSearchResponseMock(['my-index']),
    });

    // @ts-expect-error mocking the bare minimum of our queries
    // get our signals aliases
    clients.newClusterClient.asCurrentUser.indices.getAlias.mockResolvedValueOnce({
      body: { 'my-index': { aliases: {} } },
    });

    // @ts-expect-error mocking the bare minimum of our queries
    // get our index version
    clients.newClusterClient.asCurrentUser.indices.getMapping.mockResolvedValueOnce({
      body: getIndexMappingsResponseMock('my-index'),
    });

    createSignalsMigrationRoute(server.router);
  });

  test('passes reindex options along to the reindex call', async () => {
    const reindexOptions: SignalsReindexOptions = { requests_per_second: 4, size: 10, slices: 2 };
    const request = requestMock.create({
      method: 'post',
      path: DETECTION_ENGINE_SIGNALS_MIGRATION_URL,
      body: { ...getCreateSignalsMigrationSchemaMock('my-index'), ...reindexOptions },
    });

    const response = await server.inject(request, context);

    expect(response.status).toEqual(200);
    expect(clients.newClusterClient.asCurrentUser.reindex).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          source: {
            index: 'my-index',
            size: reindexOptions.size,
          },
        }),
        requests_per_second: reindexOptions.requests_per_second,
        slices: reindexOptions.slices,
      })
    );
  });

  it('returns an inline error if write index is out of date but specified', async () => {
    clients.appClient.getSignalsIndex.mockReturnValue('my-alias');
    // @ts-expect-error mocking the bare minimum of our queries
    // stub index to be write index.
    clients.newClusterClient.asCurrentUser.indices.getAlias.mockReset().mockResolvedValueOnce({
      body: { 'my-index': { aliases: { 'my-alias': { is_write_index: true } } } },
    });

    const request = requestMock.create({
      method: 'post',
      path: DETECTION_ENGINE_SIGNALS_MIGRATION_URL,
      body: getCreateSignalsMigrationSchemaMock('my-index'),
    });
    const response = await server.inject(request, context);

    expect(response.status).toEqual(200);
    expect(response.body.indices).toEqual([
      {
        error: {
          message: 'The specified index is a write index and cannot be migrated.',
          status_code: 400,
        },
        index: 'my-index',
        migration_id: null,
      },
    ]);
  });
});
