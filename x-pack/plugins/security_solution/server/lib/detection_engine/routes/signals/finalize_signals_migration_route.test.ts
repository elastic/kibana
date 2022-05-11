/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverMock } from '../__mocks__';
import { SetupPlugins } from '../../../../plugin';
import { getFinalizeSignalsMigrationRequest } from '../__mocks__/request_responses';
import { getMigrationSavedObjectsById } from '../../migrations/get_migration_saved_objects_by_id';
import { getSignalsMigrationSavedObjectMock } from '../../migrations/saved_objects_schema.mock';
import { finalizeSignalsMigrationRoute } from './finalize_signals_migration_route';
import { RuleDataPluginService } from '@kbn/rule-registry-plugin/server';
import { ruleDataServiceMock } from '@kbn/rule-registry-plugin/server/rule_data_plugin_service/rule_data_plugin_service.mock';

jest.mock('../../migrations/get_migration_saved_objects_by_id');

describe('finalizing signals migrations', () => {
  let server: ReturnType<typeof serverMock.create>;

  beforeEach(() => {
    server = serverMock.create();

    const securityMock = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue({ user: { username: 'my-username' } }),
      },
    } as unknown as SetupPlugins['security'];
    const ruleDataPluginServiceMock =
      ruleDataServiceMock.create() as unknown as RuleDataPluginService;
    finalizeSignalsMigrationRoute(server.router, ruleDataPluginServiceMock, securityMock);
  });

  it('returns an empty array error if no migrations exists', async () => {
    (getMigrationSavedObjectsById as jest.Mock).mockResolvedValue([]);
    const response = await server.inject(getFinalizeSignalsMigrationRequest());
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      migrations: [],
    });
  });

  it('returns an inline error if a migration failed', async () => {
    const mockMigrations = [
      getSignalsMigrationSavedObjectMock({ status: 'failure' }),
      getSignalsMigrationSavedObjectMock(),
    ];
    (getMigrationSavedObjectsById as jest.Mock).mockResolvedValue(mockMigrations);

    const response = await server.inject(getFinalizeSignalsMigrationRequest());
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      migrations: [
        expect.objectContaining({
          id: mockMigrations[0].id,
          error: {
            message: 'The migration was not successful.',
            status_code: 400,
          },
          status: 'failure',
        }),
        expect.objectContaining({
          id: mockMigrations[1].id,
        }),
      ],
    });
  });
});
