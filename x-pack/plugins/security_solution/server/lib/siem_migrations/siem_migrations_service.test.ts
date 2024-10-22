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
import { SiemMigrationsService } from './siem_migrations_service';
import { MockSiemRuleMigrationsService, mockSetup, mockGetClient } from './rules/__mocks__/mocks';
import type { KibanaRequest } from '@kbn/core/server';
import type { ConfigType } from '../../config';

jest.mock('./rules/siem_rule_migrations_service');

const mockReplaySubjectNext = jest.fn();
const mockReplaySubjectComplete = jest.fn();
const mockReplaySubject$ = jest.fn(() => {
  return {
    next: mockReplaySubjectNext,
    complete: mockReplaySubjectComplete,
  };
});
jest.mock('rxjs', () => ({
  ...jest.requireActual('rxjs'),
  ReplaySubject: jest.fn().mockImplementation(() => mockReplaySubject$),
}));

const getConfig = jest.fn(
  () =>
    ({
      experimentalFeatures: {
        siemMigrationsEnabled: true,
      },
    } as ConfigType)
);

describe('SiemMigrationsService', () => {
  let siemMigrationsService: SiemMigrationsService;
  const kibanaVersion = '8.16.0';

  const esClusterClient = elasticsearchServiceMock.createClusterClient();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with siemMigrationsEnabled flag', () => {
    beforeEach(() => {
      siemMigrationsService = new SiemMigrationsService(
        { experimentalFeatures: { siemMigrationsEnabled: true } } as ConfigType,
        logger,
        kibanaVersion
      );
    });

    it('should instantiate the rule migrations service', async () => {
      expect(MockSiemRuleMigrationsService).toHaveBeenCalledWith(logger, kibanaVersion);
    });

    describe('setup', () => {
      it('should call siemRuleMigrationsService setup', async () => {
        siemMigrationsService.setup({ esClusterClient, tasksTimeoutMs: 100 });

        expect(mockSetup).toHaveBeenCalledWith({
          esClusterClient,
          tasksTimeoutMs: 100,
          pluginStop$: mockReplaySubject$,
        });
      });
    });

    describe('getClient', () => {
      let request: KibanaRequest;
      beforeEach(async () => {
        request = httpServerMock.createKibanaRequest();
      });

      it('should create rules client', async () => {
        const client = siemMigrationsService.createClient({ spaceId: 'default', request });
        expect(mockGetClient).toHaveBeenCalledWith({ spaceId: 'default', request });
      });
    });
  });

  describe('without siemMigrationsEnabled flag', () => {
    beforeEach(() => {
      siemMigrationsService = new SiemMigrationsService(
        { experimentalFeatures: { siemMigrationsEnabled: false } } as ConfigType,
        logger,
        kibanaVersion
      );
    });

    it('should instantiate the rule migrations service', async () => {
      expect(MockSiemRuleMigrationsService).toHaveBeenCalledWith(logger, kibanaVersion);
    });

    describe('setup', () => {
      it('should not call siemRuleMigrationsService setup', async () => {
        siemMigrationsService.setup({ esClusterClient, tasksTimeoutMs: 100 });
        expect(mockSetup).not.toHaveBeenCalled();
      });
    });
  });
});
