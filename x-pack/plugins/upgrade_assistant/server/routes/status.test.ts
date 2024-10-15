/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from 'src/core/server';

import { handleEsError } from '../shared_imports';
import { createMockRouter, MockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';
import { registerUpgradeStatusRoute } from './status';
import { getESUpgradeStatus } from '../lib/es_deprecations_status';
import { getKibanaUpgradeStatus } from '../lib/kibana_status';
import { getESSystemIndicesMigrationStatus } from '../lib/es_system_indices_migration';

jest.mock('../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

jest.mock('../lib/es_deprecations_status', () => ({
  getESUpgradeStatus: jest.fn(),
}));
const getESUpgradeStatusMock = getESUpgradeStatus as jest.Mock;

jest.mock('../lib/kibana_status', () => ({
  getKibanaUpgradeStatus: jest.fn(),
}));
const getKibanaUpgradeStatusMock = getKibanaUpgradeStatus as jest.Mock;

jest.mock('../lib/es_system_indices_migration', () => ({
  getESSystemIndicesMigrationStatus: jest.fn(),
}));
const getESSystemIndicesMigrationStatusMock = getESSystemIndicesMigrationStatus as jest.Mock;

const esDeprecationsResponse = {
  cluster: [
    {
      level: 'critical',
      message:
        'Model snapshot [1] for job [deprecation_check_job] has an obsolete minimum version [6.3.0].',
      details: 'Delete model snapshot [1] or update it to 7.0.0 or greater.',
      url: 'doc_url',
      correctiveAction: {
        type: 'mlSnapshot',
        snapshotId: '1',
        jobId: 'deprecation_check_job',
      },
    },
  ],
  indices: [],
  totalCriticalDeprecations: 1,
};

const esNoDeprecationsResponse = {
  cluster: [],
  indices: [],
  totalCriticalDeprecations: 0,
};

const systemIndicesMigrationResponse = {
  migration_status: 'MIGRATION_NEEDED',
  features: [
    {
      feature_name: 'machine_learning',
      minimum_index_version: '7.1.1',
      migration_status: 'MIGRATION_NEEDED',
      indices: [
        {
          index: '.ml-config',
          version: '7.1.1',
        },
        {
          index: '.ml-notifications',
          version: '7.1.1',
        },
      ],
    },
  ],
};

const systemIndicesNoMigrationResponse = {
  migration_status: 'NO_MIGRATION_NEEDED',
  features: [],
};

describe('Status API', () => {
  let mockRouter: MockRouter;
  let routeDependencies: any;

  beforeEach(() => {
    mockRouter = createMockRouter();
    routeDependencies = {
      router: mockRouter,
      lib: { handleEsError },
    };
    registerUpgradeStatusRoute(routeDependencies);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/upgrade_assistant/status', () => {
    it('returns readyForUpgrade === false if Kibana or ES contain critical deprecations and no system indices need migration', async () => {
      getESUpgradeStatusMock.mockResolvedValue(esDeprecationsResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 1,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesNoMigrationResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: false,
        details:
          'The following issues must be resolved before upgrading: 1 Elasticsearch deprecation issue, 1 Kibana deprecation issue.',
      });
    });

    it('returns readyForUpgrade === false if Kibana or ES contain critical deprecations and system indices need migration', async () => {
      getESUpgradeStatusMock.mockResolvedValue(esDeprecationsResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 1,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesMigrationResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: false,
        details:
          'The following issues must be resolved before upgrading: 1 unmigrated system index, 1 Elasticsearch deprecation issue, 1 Kibana deprecation issue.',
      });
    });

    it('returns readyForUpgrade === false if no critical Kibana or ES deprecations but system indices need migration', async () => {
      getESUpgradeStatusMock.mockResolvedValue(esNoDeprecationsResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 0,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesMigrationResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: false,
        details:
          'The following issues must be resolved before upgrading: 1 unmigrated system index.',
      });
    });

    it('returns readyForUpgrade === true if there are no critical deprecations and no system indices need migration', async () => {
      getESUpgradeStatusMock.mockResolvedValue(esNoDeprecationsResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 0,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesNoMigrationResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: true,
        details: 'All deprecation warnings have been resolved.',
      });
    });

    it('returns an error if it throws', async () => {
      getESUpgradeStatusMock.mockRejectedValue(new Error('test error'));

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 0,
      });

      await expect(
        routeDependencies.router.getHandler({
          method: 'get',
          pathPattern: '/api/upgrade_assistant/status',
        })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory)
      ).rejects.toThrow('test error');
    });
  });
});
