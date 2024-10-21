/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SiemRuleMigrationsService } from './siem_rule_migrations_service';
import type { SiemRuleMigrationsClient } from './types';
import { Subject } from 'rxjs';
import { requestMock } from '../../detection_engine/routes/__mocks__';
import type { RuleMigration } from '../../../../common/siem_migrations/model/rule_migration.gen';

const indexName = 'mocked_data_stream_name';
const mockInstall = jest.fn().mockResolvedValue(undefined);
const mockInstallSpace = jest.fn().mockResolvedValue(indexName);

jest.mock('./data_stream/rule_migrations_data_stream', () => {
  return {
    RuleMigrationsDataStream: jest.fn().mockImplementation(() => ({
      install: mockInstall,
      installSpace: mockInstallSpace,
    })),
  };
});

describe('SiemRuleMigrationsService', () => {
  let ruleMigrationsService: SiemRuleMigrationsService;
  const kibanaVersion = '8.16.0';

  const esClusterClient = elasticsearchServiceMock.createClusterClient();
  const logger = loggingSystemMock.createLogger();
  const pluginStop$ = new Subject<void>();

  beforeEach(() => {
    jest.clearAllMocks();
    ruleMigrationsService = new SiemRuleMigrationsService(logger, kibanaVersion);
  });

  describe('setup', () => {
    it('should set esClusterClient and call dataStreamAdapter.install', async () => {
      await ruleMigrationsService.setup({ esClusterClient, pluginStop$ });

      expect(mockInstall).toHaveBeenCalledWith({
        esClient: esClusterClient.asInternalUser,
        logger,
        pluginStop$,
      });
    });
  });

  describe('getClient', () => {
    describe('without setup', () => {
      it('should throw an error', () => {
        expect(() => {
          ruleMigrationsService.getClient({ spaceId: 'default', request: requestMock.create() });
        }).toThrowError('ES client not available, please call setup first');
      });
    });

    describe('with setup', () => {
      beforeEach(async () => {
        await ruleMigrationsService.setup({ esClusterClient, pluginStop$ });
      });

      it('should return a client with create and search methods after setup', async () => {
        const client: SiemRuleMigrationsClient = ruleMigrationsService.getClient({
          spaceId: 'default',
          request: requestMock.create(),
        });

        expect(client).toHaveProperty('create');
        expect(client).toHaveProperty('search');
      });

      it('should call ES bulk create API with the correct parameters with create is called', async () => {
        const client: SiemRuleMigrationsClient = ruleMigrationsService.getClient({
          spaceId: 'default',
          request: requestMock.create(),
        });

        const ruleMigrations = [{ migration_id: 'dummy_migration_id' } as RuleMigration];
        await client.create(ruleMigrations);

        expect(esClusterClient.asScoped().asCurrentUser.bulk).toHaveBeenCalledWith(
          expect.objectContaining({
            body: [{ create: { _index: indexName } }, { migration_id: 'dummy_migration_id' }],
            refresh: 'wait_for',
          })
        );
      });

      it('should call ES search API with the correct parameters with search is called', async () => {
        const client: SiemRuleMigrationsClient = ruleMigrationsService.getClient({
          spaceId: 'default',
          request: requestMock.create(),
        });

        const term = { migration_id: 'dummy_migration_id' };
        await client.search(term);

        expect(esClusterClient.asScoped().asCurrentUser.search).toHaveBeenCalledWith(
          expect.objectContaining({
            index: indexName,
            body: { query: { term } },
          })
        );
      });
    });
  });
});
