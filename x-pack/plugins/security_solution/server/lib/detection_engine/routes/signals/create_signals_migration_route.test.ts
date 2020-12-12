/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { requestMock, serverMock } from '../__mocks__';
import { SignalsReindexOptions } from '../../../../../common/detection_engine/schemas/request/create_signals_migration_schema';
import { DETECTION_ENGINE_SIGNALS_MIGRATION_URL } from '../../../../../common/constants';
import { getCreateSignalsMigrationSchemaMock } from '../../../../../common/detection_engine/schemas/request/create_signals_migration_schema.mock';
import { getIndexVersionsByIndex } from '../../migrations/get_index_versions_by_index';
import { getSignalVersionsByIndex } from '../../migrations/get_signal_versions_by_index';
import { createMigration } from '../../migrations/create_migration';
import { getIndexAliases } from '../../index/get_index_aliases';
import { createSignalsMigrationRoute } from './create_signals_migration_route';

jest.mock('../../index/get_index_aliases');
jest.mock('../../migrations/create_migration');
jest.mock('../../migrations/get_index_versions_by_index');
jest.mock('../../migrations/get_signal_versions_by_index');

describe('creating signals migrations route', () => {
  let server: ReturnType<typeof serverMock.create>;

  beforeEach(() => {
    server = serverMock.create();

    (getIndexAliases as jest.Mock).mockResolvedValue([
      { index: 'my-signals-index', isWriteIndex: false },
    ]);
    (getIndexVersionsByIndex as jest.Mock).mockResolvedValue({ 'my-signals-index': -1 });
    (getSignalVersionsByIndex as jest.Mock).mockResolvedValue({ 'my-signals-index': [] });

    createSignalsMigrationRoute(server.router);
  });

  it('passes options to the createMigration', async () => {
    const reindexOptions: SignalsReindexOptions = { requests_per_second: 4, size: 10, slices: 2 };
    const request = requestMock.create({
      method: 'post',
      path: DETECTION_ENGINE_SIGNALS_MIGRATION_URL,
      body: { ...getCreateSignalsMigrationSchemaMock('my-signals-index'), ...reindexOptions },
    });

    const response = await server.inject(request);

    expect(response.status).toEqual(200);
    expect(createMigration).toHaveBeenCalledWith(
      expect.objectContaining({
        reindexOptions,
        index: 'my-signals-index',
      })
    );
  });

  it('returns an inline error if write index is out of date but specified', async () => {
    // stub index to be write index.
    (getIndexAliases as jest.Mock).mockResolvedValue([
      { index: 'my-signals-index', isWriteIndex: true },
    ]);

    const request = requestMock.create({
      method: 'post',
      path: DETECTION_ENGINE_SIGNALS_MIGRATION_URL,
      body: getCreateSignalsMigrationSchemaMock('my-signals-index'),
    });
    const response = await server.inject(request);

    expect(response.status).toEqual(200);
    expect(response.body.indices).toEqual([
      {
        error: {
          message: 'The specified index is a write index and cannot be migrated.',
          status_code: 400,
        },
        index: 'my-signals-index',
        migration_id: null,
        migration_index: null,
      },
    ]);
  });
});
