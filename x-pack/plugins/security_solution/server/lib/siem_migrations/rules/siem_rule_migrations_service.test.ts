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
  securityServiceMock,
} from '@kbn/core/server/mocks';
import { SiemRuleMigrationsService } from './siem_rule_migrations_service';
import { Subject } from 'rxjs';
import {
  MockRuleMigrationsDataStream,
  mockInstall,
  mockCreateClient,
} from './data_stream/__mocks__/mocks';
import type { SiemRuleMigrationsCreateClientParams } from './types';

jest.mock('./data_stream/rule_migrations_data_stream');
jest.mock('./task/rule_migrations_task_runner', () => ({
  RuleMigrationsTaskRunner: jest.fn(),
}));

describe('SiemRuleMigrationsService', () => {
  let ruleMigrationsService: SiemRuleMigrationsService;
  const kibanaVersion = '8.16.0';

  const esClusterClient = elasticsearchServiceMock.createClusterClient();
  const currentUser = securityServiceMock.createMockAuthenticatedUser();
  const logger = loggingSystemMock.createLogger();
  const pluginStop$ = new Subject<void>();

  beforeEach(() => {
    jest.clearAllMocks();
    ruleMigrationsService = new SiemRuleMigrationsService(logger, kibanaVersion);
  });

  it('should instantiate the rule migrations data stream adapter', () => {
    expect(MockRuleMigrationsDataStream).toHaveBeenCalledWith(logger, kibanaVersion);
  });

  describe('when setup is called', () => {
    it('should set esClusterClient and call dataStreamAdapter.install', () => {
      ruleMigrationsService.setup({ esClusterClient, pluginStop$ });

      expect(mockInstall).toHaveBeenCalledWith({
        esClient: esClusterClient.asInternalUser,
        pluginStop$,
      });
    });
  });

  describe('when createClient is called', () => {
    let createClientParams: SiemRuleMigrationsCreateClientParams;

    beforeEach(() => {
      createClientParams = {
        spaceId: 'default',
        currentUser,
        request: httpServerMock.createKibanaRequest(),
      };
    });

    describe('without setup', () => {
      it('should throw an error', () => {
        expect(() => {
          ruleMigrationsService.createClient(createClientParams);
        }).toThrowError('ES client not available, please call setup first');
      });
    });

    describe('with setup', () => {
      beforeEach(() => {
        ruleMigrationsService.setup({ esClusterClient, pluginStop$ });
      });

      it('should call installSpace', () => {
        ruleMigrationsService.createClient(createClientParams);
        expect(mockCreateClient).toHaveBeenCalledWith({
          spaceId: createClientParams.spaceId,
          currentUser: createClientParams.currentUser,
          esClient: esClusterClient.asScoped().asCurrentUser,
        });
      });

      it('should return data and task clients', () => {
        const client = ruleMigrationsService.createClient(createClientParams);

        expect(client).toHaveProperty('data');
        expect(client).toHaveProperty('task');
      });
    });
  });
});
