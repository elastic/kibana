/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  loggingSystemMock,
  elasticsearchServiceMock,
  httpServerMock,
} from '@kbn/core/server/mocks';
import { SiemRuleMigrationsService } from './siem_rule_migrations_service';
import { Subject } from 'rxjs';
import type { RuleMigration } from '../../../../common/siem_migrations/model/rule_migration.gen';
import {
  MockRuleMigrationsDataStream,
  mockInstall,
  mockInstallSpace,
  mockIndexName,
} from './data_stream/__mocks__/mocks';
import type { KibanaRequest } from '@kbn/core/server';

jest.mock('./data_stream/rule_migrations_data_stream');

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

  it('should instantiate the rule migrations data stream adapter', () => {
    expect(MockRuleMigrationsDataStream).toHaveBeenCalledWith({ kibanaVersion });
  });

  describe('when setup is called', () => {
    it('should set esClusterClient and call dataStreamAdapter.install', () => {
      ruleMigrationsService.setup({ esClusterClient, pluginStop$ });

      expect(mockInstall).toHaveBeenCalledWith({
        esClient: esClusterClient.asInternalUser,
        logger,
        pluginStop$,
      });
    });
  });

  describe('when getClient is called', () => {
    let request: KibanaRequest;
    beforeEach(() => {
      request = httpServerMock.createKibanaRequest();
    });

    describe('without setup', () => {
      it('should throw an error', () => {
        expect(() => {
          ruleMigrationsService.getClient({ spaceId: 'default', request });
        }).toThrowError('ES client not available, please call setup first');
      });
    });

    describe('with setup', () => {
      beforeEach(() => {
        ruleMigrationsService.setup({ esClusterClient, pluginStop$ });
      });

      it('should call installSpace', () => {
        ruleMigrationsService.getClient({ spaceId: 'default', request });

        expect(mockInstallSpace).toHaveBeenCalledWith('default');
      });

      it('should return a client with create and search methods after setup', () => {
        const client = ruleMigrationsService.getClient({ spaceId: 'default', request });

        expect(client).toHaveProperty('create');
        expect(client).toHaveProperty('search');
      });

      it('should call ES bulk create API with the correct parameters with create is called', async () => {
        const client = ruleMigrationsService.getClient({ spaceId: 'default', request });

        const ruleMigrations = [{ migration_id: 'dummy_migration_id' } as RuleMigration];
        await client.create(ruleMigrations);

        expect(esClusterClient.asScoped().asCurrentUser.bulk).toHaveBeenCalledWith(
          expect.objectContaining({
            body: [{ create: { _index: mockIndexName } }, { migration_id: 'dummy_migration_id' }],
            refresh: 'wait_for',
          })
        );
      });

      it('should call ES search API with the correct parameters with search is called', async () => {
        const client = ruleMigrationsService.getClient({ spaceId: 'default', request });

        const term = { migration_id: 'dummy_migration_id' };
        await client.search(term);

        expect(esClusterClient.asScoped().asCurrentUser.search).toHaveBeenCalledWith(
          expect.objectContaining({
            index: mockIndexName,
            body: { query: { term } },
          })
        );
      });
    });
  });
});
