/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { serverMock } from '../__mocks__';
import { getFinalizeSignalsMigrationRequest } from '../__mocks__/request_responses';
import { getMigrationSavedObjectsByIndex } from '../../migrations/get_migration_saved_objects_by_index';
import { getSignalsMigrationSavedObjectMock } from '../../migrations/saved_objects_schema.mock';
import { finalizeSignalsMigrationRoute } from './finalize_signals_migration_route';

jest.mock('../../migrations/get_migration_saved_objects_by_index');

describe('finalizing signals migrations', () => {
  let server: ReturnType<typeof serverMock.create>;

  beforeEach(() => {
    server = serverMock.create();

    finalizeSignalsMigrationRoute(server.router);
  });

  it('returns an inline error if no migration exists', async () => {
    (getMigrationSavedObjectsByIndex as jest.Mock).mockResolvedValue({
      'my-signals-index': [],
    });
    const response = await server.inject(getFinalizeSignalsMigrationRequest());
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      indices: [
        {
          error: {
            message: 'The specified index has no migrations',
            status_code: 400,
          },
          index: 'my-signals-index',
          migration_id: null,
          migration_index: null,
        },
      ],
    });
  });

  it('returns an inline error if the latest migration failed', async () => {
    (getMigrationSavedObjectsByIndex as jest.Mock).mockResolvedValue({
      'my-signals-index': [
        getSignalsMigrationSavedObjectMock({ status: 'failure' }),
        getSignalsMigrationSavedObjectMock(),
      ],
    });

    const response = await server.inject(getFinalizeSignalsMigrationRequest());
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      indices: [
        {
          error: {
            message: "The specified index's latest migration was not successful.",
            status_code: 400,
          },
          index: 'my-signals-index',
          migration_id: null,
          migration_index: null,
        },
      ],
    });
  });
});
